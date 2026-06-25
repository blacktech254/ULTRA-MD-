
const { Boom } = require("@hapi/boom");
const { DisconnectReason } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const path = require("path");
const { setupGroupCacheListeners } = require("./groupCache");
const { resetUpdateFlag } = require("../autoUpdater");
const { setupRestrictionManager, resetRestrictionListeners } = require("../restrictionManager");
const { setupVVTracker, GiftedAntiViewOnce, sendVVAnonymous, isViewOnceMsg, extractViewOnceData } = require("../gmdFunctions2");
const { getAllSettings } = require("../database/settings");

const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 50;
const WATCHDOG_INTERVAL = 120000;
const WATCHDOG_TIMEOUT = 45000;

let reconnectAttempts = 0;
let channelReactListenerActive = false;
let watchdogTimer = null;
let isReconnecting = false;
let isWatchdogReconnect = false;

const withJitter = (ms) => ms + Math.floor(Math.random() * ms * 0.3);

const clearWatchdog = () => {
    if (watchdogTimer) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
    }
};

const startWatchdog = (Gifted, startGifted) => {
    clearWatchdog();
    watchdogTimer = setInterval(async () => {
        if (isReconnecting) return;
        try {
            const result = await Promise.race([
                Gifted.query("ping"),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("watchdog timeout")), WATCHDOG_TIMEOUT)
                ),
            ]);
        } catch (err) {
            if (isReconnecting) return;
            console.warn(`⚠️ Watchdog: socket unresponsive (${err.message}), forcing reconnect...`);
            clearWatchdog();
            isReconnecting = true;
            isWatchdogReconnect = true;
            try { Gifted.end(new Error("watchdog forced reconnect")); } catch (_) {}
            setTimeout(() => {
                isReconnecting = false;
                isWatchdogReconnect = false;
                startGifted();
            }, withJitter(RECONNECT_DELAY));
        }
    }, WATCHDOG_INTERVAL);
};

const PROFESSOR_EMOJIS = [
    "🧑‍🏫", "👨‍🏫", "👩‍🏫", "🎓", "📚", "🔬", "🧪",
    "🏫", "📝", "💡", "🖊️", "📖", "🎯", "🏆", "✏️",
    "🧑‍🔬", "👨‍🔬", "🧠", "📜", "🔭", "🌍", "📐", "📏",
    "🔢", "🧮", "⚗️", "🎒", "📓", "📔", "📕", "🖋️"
];

const getRandomProfessorEmoji = () =>
    PROFESSOR_EMOJIS[Math.floor(Math.random() * PROFESSOR_EMOJIS.length)];

// OWNER_CHANNELS is populated at runtime from settings (NEWSLETTER_JID + any DB-added channels)
// It starts empty and is filled by getOwnerChannels() below
const OWNER_CHANNELS = [];

// Resolves all channels the bot should track: built-in NEWSLETTER_JID + custom DB entries
const getOwnerChannels = async () => {
    const extraChannels = [];
    try {
        const { getSetting } = require("../database/settings");
        const dbChannels = await getSetting("OWNER_CHANNELS");
        if (dbChannels) {
            dbChannels.split(",").map(j => j.trim()).filter(j => j.endsWith("@newsletter"))
                .forEach(j => extraChannels.push(j));
        }
        // Always include the bot's own channel (NEWSLETTER_JID setting)
        const botChannel = await getSetting("NEWSLETTER_JID");
        if (botChannel && botChannel.endsWith("@newsletter") && !extraChannels.includes(botChannel)) {
            extraChannels.unshift(botChannel);
        }
    } catch (_) {}
    return [...new Set([...OWNER_CHANNELS, ...extraChannels])];
};

const safeNewsletterFollow = async (Gifted, newsletterJid) => {
    if (!newsletterJid) return false;
    try {
        await Gifted.newsletterFollow(newsletterJid);
        return true;
    } catch (error) {
        console.error(
            `❌ Channel follow failed for ${newsletterJid}:`,
            error.message,
        );
        return false;
    }
};

const safeGroupAcceptInvite = async (Gifted, groupJid) => {
    if (!groupJid) return false;
    try {
        await Gifted.groupAcceptInvite(groupJid);
        return true;
    } catch (error) {
        switch (error.data) {
            case 409:
                console.log(`ℹ️ Already in group: ${groupJid}`);
                break;
            case 400:
                console.log(`⚠️ Invalid invite code for group: ${groupJid}`);
                break;
            case 403:
                console.log(`⚠️ No permission to join group: ${groupJid}`);
                break;
            default:
                console.error(
                    `❌ Group join failed for ${groupJid}:`,
                    error.message,
                );
        }
        return false;
    }
};

const autoFollowOwnerChannels = async (Gifted) => {
    const allChannels = await getOwnerChannels();

    for (const jid of allChannels) {
        await safeNewsletterFollow(Gifted, jid);
    }
    if (allChannels.length > 0) {
        console.log(`📡 Auto-followed ${allChannels.length} channel(s)`);
    }
};

const setupNewsletterReactions = (Gifted) => {
    if (channelReactListenerActive) return;
    channelReactListenerActive = true;

    Gifted.ev.on("messages.upsert", async ({ messages, type }) => {
        try {
            for (const msg of messages) {
                if (!msg?.key?.remoteJid) continue;
                const jid = msg.key.remoteJid;
                if (!jid.endsWith("@newsletter")) continue;

                // Check if auto channel react is enabled
                try {
                    const { getSetting } = require("../database/settings");
                    const autoLike = await getSetting("AUTO_CHANNEL_LIKE");
                    if (autoLike === "false") continue;
                } catch (_) {}

                const allChannels = await getOwnerChannels();
                if (!allChannels.includes(jid)) continue;

                const serverMessageId = msg.key.id;
                if (!serverMessageId) continue;

                const emoji = getRandomProfessorEmoji();

                try {
                    if (typeof Gifted.newsletterReactMessage === "function") {
                        await Gifted.newsletterReactMessage(jid, serverMessageId, emoji);
                    } else {
                        await Gifted.sendMessage(jid, {
                            react: { key: msg.key, text: emoji },
                        });
                    }
                    console.log(`📡 Auto-reacted to channel post [${jid.split("@")[0]}] with ${emoji}`);
                } catch (reactErr) {
                    try {
                        await Gifted.sendMessage(jid, {
                            react: { key: msg.key, text: emoji },
                        });
                    } catch (_) {}
                }
            }
        } catch (err) {
            console.error("Newsletter react error:", err.message);
        }
    });
};

// ── Stalk (presence tracking) ──────────────────────────────────────────────
const stalkTargets = new Map();

const addStalkTarget = (targetNum, requesterJid, label) => {
    if (!stalkTargets.has(targetNum)) stalkTargets.set(targetNum, []);
    const list = stalkTargets.get(targetNum);
    if (!list.find(e => e.requesterJid === requesterJid)) {
        list.push({ requesterJid, label });
    }
};

const removeStalkTarget = (targetNum, requesterJid) => {
    if (!stalkTargets.has(targetNum)) return false;
    const filtered = stalkTargets.get(targetNum).filter(e => e.requesterJid !== requesterJid);
    if (filtered.length === 0) stalkTargets.delete(targetNum);
    else stalkTargets.set(targetNum, filtered);
    return true;
};

const getStalkTargets = () => stalkTargets;

let stalkListenerActive = false;

const setupStalkListener = (Gifted) => {
    if (stalkListenerActive) return;
    stalkListenerActive = true;
    Gifted.ev.on("presence.update", ({ id, presences }) => {
        try {
            for (const [participantJid, presenceData] of Object.entries(presences || {})) {
                const num = participantJid.split("@")[0].split(":")[0];
                if (!stalkTargets.has(num)) continue;
                const status = presenceData?.lastKnownPresence;
                if (status !== "available") continue;
                const stalkers = stalkTargets.get(num);
                const timeStr = new Date().toLocaleString();
                for (const { requesterJid, label } of stalkers) {
                    Gifted.sendMessage(requesterJid, {
                        text: `👁️ *STALK ALERT* 👁️\n╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍╍\n📱 Target: *${label || `+${num}`}*\n🟢 Status: *Online Now*\n🕐 Time: ${timeStr}\n\n_Use \`.unstalk ${label || `+${num}`}\` to stop tracking._`,
                    }).catch(() => {});
                }
            }
        } catch (_) {}
    });
};
// ────────────────────────────────────────────────────────────────────────────

// ── Anti-ViewOnce: save view-once on reply OR reaction (bot or owner) ────────
// • Caches every incoming view-once by BOTH message ID and remoteJid+sender key
// • Triggers silently when the bot OR the owner replies/reacts to the message
// • Exhaustively checks every known contextInfo path across all message types
// • Original sender is NEVER notified — no read receipt, no "opened" signal
// • ON by default (indm) — forwards to bot's own DM where session ID lives
let _antiVOListenerActive = false;

// Primary cache: msgId -> { msg, remoteJid, senderJid, ts }
const _voCache = new Map();
// Secondary index: "remoteJid|senderJid" -> Set of msgIds (for partial-match fallback)
const _voIndex = new Map();

const _VO_TTL = 30 * 60 * 1000; // 30 minutes — generous window

const _cacheVO = (msg) => {
    const id       = msg.key.id;
    const remoteJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || remoteJid;
    const entry    = { msg, remoteJid, senderJid, ts: Date.now() };
    _voCache.set(id, entry);

    // secondary index
    const idxKey = `${remoteJid}|${senderJid}`;
    if (!_voIndex.has(idxKey)) _voIndex.set(idxKey, new Set());
    _voIndex.get(idxKey).add(id);

    // auto-evict after TTL
    setTimeout(() => {
        _voCache.delete(id);
        const s = _voIndex.get(idxKey);
        if (s) { s.delete(id); if (s.size === 0) _voIndex.delete(idxKey); }
    }, _VO_TTL);
};

const _consumeVO = (id) => {
    const entry = _voCache.get(id);
    if (!entry) return null;
    _voCache.delete(id);
    const idxKey = `${entry.remoteJid}|${entry.senderJid}`;
    const s = _voIndex.get(idxKey);
    if (s) { s.delete(id); if (s.size === 0) _voIndex.delete(idxKey); }
    return entry.msg;
};

// Non-destructive read — leaves the entry in the cache so setupAntiViewOnce still fires
const _peekVO = (id) => {
    const entry = _voCache.get(id);
    return entry ? entry.msg : null;
};

// Extract every possible quoted/referenced message ID from any outgoing message
const _extractTargetIds = (msg) => {
    const ids = new Set();
    const m = msg?.message;
    if (!m) return ids;

    // Direct reaction
    const rKey = m.reactionMessage?.key?.id;
    if (rKey) ids.add(rKey);

    // Every message type that can carry contextInfo
    const TYPES = [
        "extendedTextMessage", "imageMessage", "videoMessage", "audioMessage",
        "documentMessage", "stickerMessage", "buttonsResponseMessage",
        "listResponseMessage", "templateButtonReplyMessage", "interactiveResponseMessage",
        "viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension",
    ];
    for (const t of TYPES) {
        const ctx = m[t]?.contextInfo;
        if (ctx?.stanzaId) ids.add(ctx.stanzaId);
        if (ctx?.quotedMessage) {
            // Deep: quoted message might itself be a viewOnceMessage wrapper
            const inner = ctx.quotedMessage;
            for (const it of TYPES) {
                if (inner[it]?.contextInfo?.stanzaId) ids.add(inner[it].contextInfo.stanzaId);
            }
        }
    }

    // Nested wrappers — ephemeral / disappearing message shells
    const nested =
        m.ephemeralMessage?.message ||
        m.deviceSentMessage?.message ||
        m.futureProofMessage?.message;
    if (nested) {
        const wrapper = { message: nested, key: msg.key };
        for (const id of _extractTargetIds(wrapper)) ids.add(id);
    }

    return ids;
};

const setupAntiViewOnce = (Gifted) => {
    if (_antiVOListenerActive) return;
    _antiVOListenerActive = true;

    const { getSetting } = require("../database/settings");

    // ── Step 1: Cache every incoming view-once immediately ──────────────────
    Gifted.ev.on("messages.upsert", async ({ messages, type }) => {
        for (const msg of messages) {
            try {
                if (!msg?.message) continue;
                if (msg.key.fromMe) continue;
                if (msg.key.remoteJid === "status@broadcast") continue;

                const m = msg.message;

                // All known view-once wrappers + inline viewOnce flags
                const isViewOnce =
                    m.viewOnceMessage ||
                    m.viewOnceMessageV2 ||
                    m.viewOnceMessageV2Extension ||
                    m.imageMessage?.viewOnce ||
                    m.videoMessage?.viewOnce ||
                    m.audioMessage?.viewOnce ||
                    // wrapped inside ephemeral/deviceSent
                    m.ephemeralMessage?.message?.viewOnceMessage ||
                    m.ephemeralMessage?.message?.viewOnceMessageV2 ||
                    m.deviceSentMessage?.message?.viewOnceMessage ||
                    m.deviceSentMessage?.message?.viewOnceMessageV2;

                if (!isViewOnce) continue;

                // Guard: only act if feature is not explicitly off
                const setting = await getSetting("ANTIVIEWONCE").catch(() => "indm");
                if ((setting || "indm") === "off") continue;

                _cacheVO(msg);
            } catch (e) {
                console.error("[AntiViewOnce/cache]", e.message);
            }
        }
    });

    // ── Step 2: Trigger on ANY reply or reaction — bot OR owner ─────────────
    Gifted.ev.on("messages.upsert", async ({ messages }) => {
        for (const msg of messages) {
            try {
                const isFromMe = msg.key.fromMe;

                // Accept: sent by bot (fromMe) OR sent by the owner from another device
                // Owner messages appear as fromMe=false but participant matches owner number
                const ownerNum = await getSetting("OWNER_NUMBER").catch(() => "");
                const senderJid = msg.key.participant || msg.key.remoteJid || "";
                const senderNum = senderJid.split("@")[0].split(":")[0];
                const isOwner   = ownerNum && senderNum === ownerNum;

                if (!isFromMe && !isOwner) continue;
                if (!msg?.message) continue;

                // Collect every possible referenced message ID
                const targetIds = _extractTargetIds(msg);
                if (targetIds.size === 0) continue;

                for (const targetId of targetIds) {
                    const cachedMsg = _consumeVO(targetId);
                    if (!cachedMsg) continue;

                    // Fire — silently forward to bot DM
                    setImmediate(() =>
                        GiftedAntiViewOnce(Gifted, cachedMsg).catch(e =>
                            console.error("[AntiViewOnce/fire]", e.message)
                        )
                    );
                    break; // one hit per outgoing message is enough
                }
            } catch (e) {
                console.error("[AntiViewOnce/trigger]", e.message);
            }
        }
    });
};

// ── Auto-Save View-Once: react with ❤️ or 😂 → silently saved to reactor's own DM ──
// Uses the SQLite message store (reliable regardless of ANTIVIEWONCE setting).
let _autoSaveVOActive = false;

// Normalized emoji set — variation selector \uFE0F stripped for reliable matching
const _AUTOSAVE_EMOJIS_NORMALIZED = new Set(
    ["❤️", "❤", "😍", "😂", "🤣", "👀", "🔥", "💯", "😱", "🫣"].map(e => e.replace(/\uFE0F/g, ""))
);

const setupAutoSaveVO = (Gifted) => {
    if (_autoSaveVOActive) return;
    _autoSaveVOActive = true;

    const { loadMsg } = require('../database/messageStore');

    Gifted.ev.on("messages.upsert", async ({ messages }) => {
        for (const msg of messages) {
            try {
                if (!msg?.message?.reactionMessage) continue;
                if (msg.key.remoteJid === "status@broadcast") continue;

                const reaction = msg.message.reactionMessage;

                // Normalize: strip variation selectors so ❤️ == ❤ etc.
                const emojiNorm = (reaction.text || "").replace(/\uFE0F/g, "").trim();
                if (!_AUTOSAVE_EMOJIS_NORMALIZED.has(emojiNorm)) continue;

                const reactedId = reaction.key?.id;
                const from = msg.key.remoteJid;
                if (!reactedId || !from) continue;

                // Use the SQLite message store — works even if ANTIVIEWONCE is off
                const original = loadMsg(from, reactedId);
                if (!original?.message) continue;
                if (!isViewOnceMsg(original.message)) continue;

                const { content, type } = extractViewOnceData(original.message);
                if (!content || !type) continue;

                // Forward silently to the reactor's own DM
                const reactorJid = msg.key.participant || msg.key.remoteJid;
                const reactorNum  = reactorJid.split("@")[0].split(":")[0];
                const reactorDmJid = `${reactorNum}@s.whatsapp.net`;

                // Show original sender in the caption
                const origSenderJid = original.key?.participant || original.key?.remoteJid || "";
                const origSenderNum  = origSenderJid.split("@")[0].split(":")[0];

                const settings = await getAllSettings();
                const botName = settings.BOT_NAME || "ULTRA GURU";

                await sendVVAnonymous(Gifted, content, type, reactorDmJid, botName, origSenderNum);
                console.log(`[AutoSaveVO] Saved view-once for reactor @${reactorNum}`);
            } catch (e) {
                console.error("[AutoSaveVO] Error:", e.message);
            }
        }
    });
};

const setupConnectionHandler = (
    Gifted,
    sessionDir,
    startGifted,
    callbacks = {},
) => {
    setupGroupCacheListeners(Gifted);
    setupNewsletterReactions(Gifted);
    setupRestrictionManager(Gifted);
    setupVVTracker(Gifted);
    setupStalkListener(Gifted);
    setupAntiViewOnce(Gifted);
    setupAutoSaveVO(Gifted);

    Gifted.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log("🕗 Connecting Bot...");
        }

        if (connection === "open") {
            console.log("✅ Connection Instance is Online");
            reconnectAttempts = 0;
            isReconnecting = false;

            startWatchdog(Gifted, startGifted);

            if (callbacks.onOpen) {
                await callbacks.onOpen(Gifted);
            }

            setTimeout(async () => {
                await autoFollowOwnerChannels(Gifted);
            }, 3000);
        }

        if (connection === "close") {
            clearWatchdog();
            channelReactListenerActive = false;
            _antiVOListenerActive = false;
            resetRestrictionListeners();

            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(`⚠️ Connection closed. Reason code: ${reason}`);

            const handleReconnect = (extraDelay = 0) => {
                if (isReconnecting) return;
                isReconnecting = true;

                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn(
                        `⚠️ ${MAX_RECONNECT_ATTEMPTS} reconnect attempts exhausted — cooling down for 2 minutes before retrying...`,
                    );
                    reconnectAttempts = 0;
                    setTimeout(() => {
                        isReconnecting = false;
                        startGifted();
                    }, withJitter(120000));
                    return;
                }

                reconnectAttempts++;
                const baseDelay = Math.min(
                    RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1),
                    120000,
                );
                const delay = withJitter(baseDelay) + extraDelay;
                console.log(
                    `🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(delay / 1000)}s...`,
                );
                setTimeout(() => {
                    isReconnecting = false;
                    startGifted();
                }, delay);
            };

            switch (reason) {
                case DisconnectReason.badSession:
                    if (isWatchdogReconnect) {
                        console.log("⚠️ Watchdog-triggered close received code 500 — reconnecting safely...");
                        isWatchdogReconnect = false;
                        break;
                    }
                    console.log("❌ Bad session — deleting session file. Please re-link the bot.");
                    try {
                        await fs.remove(sessionDir);
                    } catch (e) {
                        console.error("Failed to remove session:", e);
                    }
                    process.exit(1);
                    break;

                case DisconnectReason.connectionReplaced:
                    console.log("❌ Connection replaced by another session. Shutting down this instance.");
                    process.exit(1);
                    break;

                case DisconnectReason.loggedOut:
                    console.log("❌ Device logged out — deleting session. Please re-link the bot.");
                    try {
                        await fs.remove(sessionDir);
                    } catch (e) {
                        console.error("❌ Failed to remove session:", e);
                    }
                    process.exit(1);
                    break;

                case DisconnectReason.restartRequired:
                    console.log("🔄 WhatsApp restart signal received — reconnecting quickly...");
                    if (!isReconnecting) {
                        isReconnecting = true;
                        setTimeout(() => {
                            isReconnecting = false;
                            startGifted();
                        }, 1500);
                    }
                    break;

                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                    console.log("🔄 Transient disconnect — reconnecting...");
                    handleReconnect();
                    break;

                case DisconnectReason.timedOut:
                    console.log("⏱️ Connection timed out — reconnecting with extra delay...");
                    handleReconnect(RECONNECT_DELAY);
                    break;

                default:
                    console.log(`⚠️ Unknown disconnect reason (${reason}) — attempting reconnect...`);
                    handleReconnect();
            }
        }
    });
};

module.exports = {
    safeNewsletterFollow,
    safeGroupAcceptInvite,
    setupConnectionHandler,
    RECONNECT_DELAY,
    MAX_RECONNECT_ATTEMPTS,
    OWNER_CHANNELS,
    addStalkTarget,
    removeStalkTarget,
    getStalkTargets,
    PROFESSOR_EMOJIS,
    getRandomProfessorEmoji,
};
