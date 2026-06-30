require("events").EventEmitter.defaultMaxListeners = 960;

if (!globalThis.crypto) {
    const { webcrypto } = require("crypto");
    globalThis.crypto = webcrypto;
}

if (typeof File === "undefined") {
    try {
        const { File } = require("buffer");
        if (File) globalThis.File = File;
    } catch (_) {}
}

require("./guru/gmdHelpers");

const {
    default: makeWASocket,
    jidNormalizedUser,
    fetchLatestWaWebVersion,
} = require("@whiskeysockets/baileys");

const {
    logger,
    commands,
    loadSession,
    useSQLiteAuthState,
    safeNewsletterFollow,
    safeGroupAcceptInvite,
    setupConnectionHandler,
    setupGroupEventsListeners,
    initializeLidStore,
    getAllSettings,
    DEFAULT_SETTINGS,
    createSocketConfig,
    createContext,
    syncDatabase,
    initializeSettings,
    initializeGroupSettings,
    loadPlugins,
} = require("./guru");

const { startCleanup, SQLiteStore } = require("./guru/database/messageStore");

const {
    setupAutoReact,
    setupAntiDelete,
    setupAutoBio,
    setupAntiCall,
    setupPresence,
    setupChatBotAndAntiLink,
    setupAntiEdit,
    setupStatusHandlers,
} = require("./guru/eventHandlers");

const { setupCommandHandler } = require("./guru/messageHandler");

const express = require("express");
const path = require("path");

const PORT = process.env.PORT || 5000;
const app = express();
let Gifted;
let store;

logger.level = "silent";
app.use(express.static("guru"));
app.get("/", (req, res) => res.sendFile(__dirname + "/guru/gifted.html"));
app.get("/health", (req, res) =>
    res.status(200).json({ status: "alive", uptime: process.uptime() }),
);
const server = app.listen(PORT, "0.0.0.0", () =>
    console.log(`✅ Server Running on Port: ${PORT}`),
);
server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${PORT} already in use — retrying in 3s...`);
        setTimeout(() => {
            server.close(() => {
                const retryServer = app.listen(PORT, "0.0.0.0", () =>
                    console.log(`✅ Server Running on Port: ${PORT}`),
                );
                retryServer.on("error", (retryErr) => {
                    console.error("Express server retry error:", retryErr.message);
                });
            });
        }, 3000);
    } else {
        console.error("Express server error:", err.message);
    }
});

setInterval(() => {
    const used = process.memoryUsage();
    if (used.heapUsed > 400 * 1024 * 1024) {
        if (global.gc) global.gc();
    }
}, 60000);

setInterval(async () => {
    try {
        const http = require("http");
        http.get(`http://localhost:${PORT}/health`, () => {});
    } catch (e) {}
}, 240000);

const AUTO_RESTART_MS = 24 * 60 * 60 * 1000;
setTimeout(() => {
    console.log("🔄 [AUTO-RESTART] 24-hour scheduled restart triggered.");
    process.exit(0);
}, AUTO_RESTART_MS);
console.log(
    "✅ Auto-restart scheduled in 24 hours (" +
        new Date(Date.now() + AUTO_RESTART_MS).toLocaleTimeString() +
        ")",
);

const sessionDir = path.join(__dirname, "guru", "session");
const pluginsPath = path.join(__dirname, "guruh");

let botSettings = {};
async function loadBotSettings() {
    await syncDatabase();
    await initializeSettings();
    await initializeGroupSettings();
    botSettings = await getAllSettings();
    return botSettings;
}

startCleanup();

try {
    const { startExpiryWatchdog } = require("./guru/expiry");
    startExpiryWatchdog(
        async (msg) => {
            global._licenceExpired = true;
            console.warn(
                "[EXPIRY] ⛔ Licence expired — commands locked. Bot will NOT restart.",
            );
            try {
                const ownerJid =
                    (process.env.OWNER_NUMBER || "").replace(/[^0-9]/g, "") +
                    "@s.whatsapp.net";
                if (global._botSocket && ownerJid.length > 10) {
                    await global._botSocket.sendMessage(ownerJid, {
                        text: `⛔ *ULTRA GURU MD — LICENCE EXPIRED*\n\n${msg}\n\n_Commands are locked. Renew your licence to continue._`,
                    });
                }
            } catch {}
        },
        async (warnMsg) => {
            try {
                const ownerJid =
                    (process.env.OWNER_NUMBER || "").replace(/[^0-9]/g, "") +
                    "@s.whatsapp.net";
                if (global._botSocket && ownerJid.length > 10) {
                    await global._botSocket.sendMessage(ownerJid, {
                        text: warnMsg,
                    });
                }
            } catch {}
        },
    );
} catch (e) {
    console.warn("[EXPIRY] Watchdog not started:", e.message);
}

async function startGifted() {
    try {
        const { version } = await fetchLatestWaWebVersion();
        const sessionDbPath = path.join(sessionDir, "session.db");
        const { state, saveCreds } = await useSQLiteAuthState(sessionDbPath);

        if (store) store.destroy();
        store = new SQLiteStore();

        const socketConfig = createSocketConfig(version, state, logger);
        socketConfig.getMessage = async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Error occurred" };
        };

        Gifted = makeWASocket(socketConfig);
        global._botSocket = Gifted;
        store.bind(Gifted.ev);

        Gifted.ev.process(async (events) => {
            if (events["creds.update"]) await saveCreds();
        });

        setupAutoReact(Gifted);
        setupAntiDelete(Gifted);
        setupAutoBio(Gifted);
        setupAntiCall(Gifted);
        setupPresence(Gifted);
        setupChatBotAndAntiLink(Gifted);
        setupAntiEdit(Gifted);
        setupStatusHandlers(Gifted);
        setupGroupEventsListeners(Gifted);

        loadPlugins(pluginsPath);

        setupCommandHandler(Gifted);

        setupConnectionHandler(Gifted, sessionDir, startGifted, {
            onOpen: async (Gifted) => {
                const s = await getAllSettings();
                await safeNewsletterFollow(Gifted, s.NEWSLETTER_JID);
                await safeGroupAcceptInvite(Gifted, s.GC_JID);
                await initializeLidStore(Gifted);

                try {
                    const { startScheduler } = require("./guru/scheduler");
                    startScheduler(Gifted);
                } catch (e) {
                    console.error("[Scheduler] start error:", e.message);
                }

                setTimeout(async () => {
                    try {
                        const totalCommands = commands.filter(
                            (c) => c.pattern && !c.dontAddCommandList,
                        ).length;
                        console.log("💜 Connected to Whatsapp, Active!");

                        if (s.STARTING_MESSAGE === "true") {
                            const d = DEFAULT_SETTINGS;
                            const md =
                                s.MODE === "public"
                                    ? "🌐 PUBLIC"
                                    : "🔒 PRIVATE";
                            const botName = (
                                s.BOT_NAME || d.BOT_NAME
                            ).toUpperCase();
                            const { expiryLine } = require("./guru/expiry");
                            const expLine = await expiryLine().catch(
                                () => "✅ Active",
                            );
                            const connectionMsg =
`*✅ ${botName} — ONLINE*

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
📊 *Plugins*  : ${totalCommands}
⚡ *Prefix*   : ${s.PREFIX || d.PREFIX}
⚙️ *Mode*     : ${md}
🔒 *Licence*  : ${expLine}
📲 *Telegram* : t.me/GURU_TECHLAB
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
> ✨ _${s.CAPTION || d.CAPTION}_
> _Allow a few seconds to sync._`;

                            const destJid = jidNormalizedUser(Gifted.user.id);
                            let ctx = {};
                            try {
                                ctx = await createContext(
                                    s.BOT_NAME || d.BOT_NAME,
                                    {
                                        title: "BOT INTEGRATED",
                                        body: "Status: Ready for Use",
                                    },
                                );
                            } catch (_) {}
                            await Gifted.sendMessage(
                                destJid,
                                { text: connectionMsg, ...ctx },
                                {
                                    disappearingMessagesInChat: true,
                                    ephemeralExpiration: 300,
                                },
                            );
                        }
                    } catch (err) {
                        console.error("Post-connection setup error:", err);
                    }
                }, 5000);
            },
        });

        process.on("SIGINT", () => store?.destroy());
        process.on("SIGTERM", () => store?.destroy());
    } catch (error) {
        console.error("Socket initialization error:", error);
        setTimeout(() => startGifted(), 5000);
    }
}

(async () => {
    await loadSession();
    await loadBotSettings();
    startGifted();
})();
