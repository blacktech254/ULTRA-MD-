"use strict";

const crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const { PassThrough } = require("stream");
const baileys = require("@whiskeysockets/baileys");
const { gmd } = require("../guru");

// ─── COLOR MAP (hex) ─────────────────────────────────────────────────────────
const COLORS = {
    blue: "#34B7F1",
    green: "#25D366",
    yellow: "#FFD700",
    orange: "#FF8C00",
    red: "#FF3B30",
    purple: "#9C27B0",
    gray: "#9E9E9E",
    black: "#000000",
    white: "#FFFFFF",
    cyan: "#00BCD4",
};

// ─── COMMAND ─────────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "togstatus",
        aliases: ["swgc", "groupstatus"],
        react: "📡",
        category: "group",
        description: "Send text / image / video / audio as group status",
    },
    async (from, Gifted, conText) => {
        const { reply, react, mek, isGroup, newsletterJid, botName } = conText;

        if (!isGroup) return reply("❌ This command only works in groups!");

        const contextInfo = {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid || "120363200367779016@newsletter",
                newsletterName: botName || "ULTRA GURU MD",
                serverMessageId: 143,
            },
            mentionedJid: [mek.key.participant || from],
        };

        const quickReply = (text) =>
            Gifted.sendMessage(from, { text, contextInfo }, { quoted: mek });

        try {
            const raw = conText.args.join(" ").trim();
            let [caption, color, groupUrl] = raw.split("|").map((v) => v?.trim());

            // Resolve target group (optional external link)
            let targetGroupId = from;
            if (groupUrl) {
                try {
                    const code = groupUrl.split("/").pop().split("?")[0];
                    const info = await Gifted.groupGetInviteInfo(code);
                    targetGroupId = info.id;
                    await quickReply(`🎯 Target group: *${info.subject}*`);
                } catch {
                    return quickReply("❌ Invalid group link or bot is not in that group.");
                }
            }

            // Detect quoted message
            const quoted =
                mek.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                (mek.message?.imageMessage ? mek.message : null) ||
                (mek.message?.videoMessage ? mek.message : null) ||
                (mek.message?.audioMessage ? mek.message : null);

            const hasMedia =
                quoted &&
                (quoted.imageMessage || quoted.videoMessage || quoted.audioMessage);

            // ── TEXT STATUS ──────────────────────────────────────────────────
            if (!hasMedia) {
                if (!caption) {
                    return quickReply(
                        `📝 *Group Status Usage*\n\n` +
                        `\`.togstatus caption|color\`\n` +
                        `\`.togstatus |blue\`\n` +
                        `_Reply to image / video / audio_\n\n` +
                        `🎨 *Colors:*\nblue, green, yellow, orange, red,\npurple, gray, black, white, cyan`,
                    );
                }

                const bgHex = COLORS[color?.toLowerCase()] || COLORS.blue;

                await groupStatus(Gifted, targetGroupId, {
                    extendedTextMessage: {
                        text: caption,
                        backgroundArgb: hexToArgb(bgHex),
                        font: 0,
                    },
                });

                await react("✅");
                return quickReply("✅ Text status sent!");
            }

            // ── IMAGE STATUS ─────────────────────────────────────────────────
            if (quoted.imageMessage) {
                await react("⏳");
                const buf = await baileys.downloadMediaMessage(
                    buildMsgObj(mek, quoted),
                    "buffer",
                    {},
                    { reuploadRequest: Gifted.updateMediaMessage },
                );

                const content = await baileys.generateWAMessageContent(
                    { image: buf, caption: caption || "" },
                    { upload: Gifted.waUploadToServer },
                );
                await groupStatus(Gifted, targetGroupId, content);
                await react("✅");
                return quickReply("✅ Image status sent!");
            }

            // ── VIDEO STATUS ─────────────────────────────────────────────────
            if (quoted.videoMessage) {
                await react("⏳");
                const buf = await baileys.downloadMediaMessage(
                    buildMsgObj(mek, quoted),
                    "buffer",
                    {},
                    { reuploadRequest: Gifted.updateMediaMessage },
                );

                const content = await baileys.generateWAMessageContent(
                    { video: buf, caption: caption || "" },
                    { upload: Gifted.waUploadToServer },
                );
                await groupStatus(Gifted, targetGroupId, content);
                await react("✅");
                return quickReply("✅ Video status sent!");
            }

            // ── AUDIO STATUS ─────────────────────────────────────────────────
            if (quoted.audioMessage) {
                await react("⏳");
                const buf = await baileys.downloadMediaMessage(
                    buildMsgObj(mek, quoted),
                    "buffer",
                    {},
                    { reuploadRequest: Gifted.updateMediaMessage },
                );

                const vn = await toVN(buf);
                const waveform = await generateWaveform(buf);

                const content = await baileys.generateWAMessageContent(
                    {
                        audio: vn,
                        mimetype: "audio/ogg; codecs=opus",
                        ptt: true,
                    },
                    { upload: Gifted.waUploadToServer },
                );

                if (content.audioMessage) {
                    content.audioMessage.waveform = Buffer.from(waveform, "base64");
                }

                await groupStatus(Gifted, targetGroupId, content);
                await react("✅");
                return quickReply("✅ Audio status sent!");
            }

            return quickReply("❌ Unsupported media type. Reply to an image, video, or audio.");
        } catch (err) {
            console.error("[togstatus]", err);
            await react("❌");
            return quickReply(`❌ Status error:\n${err.message}`);
        }
    },
);

// ─── HELPERS ────────────────────────────────────────────────────────────────

function hexToArgb(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return ((0xff << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

function buildMsgObj(originalMessage, quotedContent) {
    const ctxInfo = originalMessage.message?.extendedTextMessage?.contextInfo;
    return {
        key: {
            remoteJid: originalMessage.key.remoteJid,
            fromMe: false,
            id: ctxInfo?.stanzaId || originalMessage.key.id,
            participant: ctxInfo?.participant,
        },
        message: quotedContent,
    };
}

async function groupStatus(conn, jid, content) {
    const secret = crypto.randomBytes(32);

    const innerMsg =
        typeof content.toJSON === "function" ? content.toJSON() : content;

    const fullContent = {
        messageContextInfo: { messageSecret: secret },
        groupStatusMessageV2: {
            message: {
                ...innerMsg,
                messageContextInfo: { messageSecret: secret },
            },
        },
    };

    const msg = baileys.generateWAMessageFromContent(jid, fullContent, {});
    await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
    return msg;
}

function toVN(buffer) {
    return new Promise((resolve, reject) => {
        const input = new PassThrough();
        const output = new PassThrough();
        const chunks = [];

        input.end(buffer);

        ffmpeg(input)
            .noVideo()
            .audioCodec("libopus")
            .format("ogg")
            .audioChannels(1)
            .audioFrequency(48000)
            .on("error", reject)
            .on("end", () => resolve(Buffer.concat(chunks)))
            .pipe(output);

        output.on("data", (c) => chunks.push(c));
        output.on("error", reject);
    });
}

function generateWaveform(buffer, bars = 64) {
    return new Promise((resolve, reject) => {
        const input = new PassThrough();
        const output = new PassThrough();
        const chunks = [];

        input.end(buffer);

        ffmpeg(input)
            .audioChannels(1)
            .audioFrequency(16000)
            .format("s16le")
            .on("error", reject)
            .on("end", () => {
                const raw = Buffer.concat(chunks);
                const samples = raw.length / 2;
                const amps = [];

                for (let i = 0; i < samples; i++) {
                    amps.push(Math.abs(raw.readInt16LE(i * 2)) / 32768);
                }

                const size = Math.max(1, Math.floor(amps.length / bars));
                const avg = Array.from({ length: bars }, (_, i) => {
                    const slice = amps.slice(i * size, (i + 1) * size);
                    return slice.length
                        ? slice.reduce((a, b) => a + b, 0) / slice.length
                        : 0;
                });

                const max = Math.max(...avg) || 1;
                resolve(
                    Buffer.from(
                        avg.map((v) => Math.floor((v / max) * 100)),
                    ).toString("base64"),
                );
            })
            .pipe(output);

        output.on("data", (c) => chunks.push(c));
        output.on("error", reject);
    });
}
