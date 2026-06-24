"use strict";

const { gmd }          = require("../guru");
const moment           = require("moment-timezone");

const {
    buildThemedMenu,
    sendMenuMsg,
    getSortedCategories,
    CAT_ICONS,
} = require("./design");

// ─── 1. MENU ──────────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "menu",
        aliases: ["help", "cmds", "commands", "start"],
        react: "📋",
        category: "general",
        description: "Show the bot command menu",
    },
    async (from, Gifted, conText) => {
        const { react } = conText;
        await react("📋");
        const text = await buildThemedMenu(conText, Gifted);
        await sendMenuMsg(Gifted, from, text, conText);
        await react("✅");
    }
);

// ─── 2. CATEGORY BODY HANDLER (reply with a number from the menu) ─────────────
// Uses getSortedCategories() from design.js — SAME source of truth as the menu.

gmd(
    {
        pattern: /^\d+$/,
        on: "body",
        dontAddCommandList: true,
        react: "📂",
        category: "general",
        description: "Reply with a category number to browse commands",
    },
    async (from, Gifted, conText) => {
        const { body, mek, botName, botPrefix, botFooter, newsletterJid, newsletterUrl, botPic, sender } = conText;

        const n    = parseInt(body.trim(), 10);
        const cats = getSortedCategories();

        if (isNaN(n) || n < 1 || n > cats.length) return;

        const { cat, cmds } = cats[n - 1];
        const icon  = CAT_ICONS[cat] || "⚡";
        const label = (cat[0].toUpperCase() + cat.slice(1)).toUpperCase();

        const cmdList = cmds.map(c => {
            const desc = c.description ? ` — _${c.description}_` : "";
            const alts = (c.aliases || []).length
                ? `\n┃   ↳ _${c.aliases.map(a => `${botPrefix}${a}`).join(", ")}_`
                : "";
            return `┃ ◈ *${botPrefix}${c.pattern}*${desc}${alts}`;
        }).join("\n");

        const text =
`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ${icon}  *${label}*
┃  _${cmds.length} command${cmds.length !== 1 ? 's' : ''} available_
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
${cmdList}
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
> ✨ _${botFooter || "Powered by GURUTECH"}_`;

        try {
            await Gifted.sendMessage(from, {
                text: text.trim(),
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 5,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: newsletterJid || "120363406649804510@newsletter",
                        newsletterName: botName || "ULTRA GURU",
                        serverMessageId: 0,
                    },
                    externalAdReply: {
                        title: botName || "ULTRA GURU",
                        body: botFooter || "Powered by GURUTECH",
                        thumbnailUrl: botPic,
                        mediaType: 1,
                        mediaUrl: botPic,
                        sourceUrl: newsletterUrl || "https://whatsapp.com/channel/0029Vb7jauLHLHQbkcbcHi0e",
                        showAdAttribution: true,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: mek });
        } catch {
            await Gifted.sendMessage(from, { text: text.trim() }, { quoted: mek });
        }
    }
);

// ─── 3. PING / ALIVE ─────────────────────────────────────────────────────────

gmd(
    {
        pattern: "ping",
        aliases: ["alive", "status", "check"],
        react: "🏓",
        category: "general",
        description: "Check if the bot is online and responsive",
    },
    async (from, Gifted, conText) => {
        const { reply, react, botName, botPrefix } = conText;
        const start = Date.now();
        await react("🏓");
        const ping = Date.now() - start;

        await reply(
`╭─⌈ 🏓 *${botName || "ULTRA GURU"}* ⌋
│ Status  : ✅ Online & Ready
│ Ping    : *${ping}ms*
│ Prefix  : *${botPrefix || "."}*
╰⊷ *${botName || "ULTRA GURU"}*`
        );
    }
);

// ─── 4. UPTIME / RUNTIME ─────────────────────────────────────────────────────

gmd(
    {
        pattern: "uptime",
        aliases: ["runtime", "ut"],
        react: "⏱️",
        category: "general",
        description: "Check how long the bot has been running",
    },
    async (from, Gifted, conText) => {
        const { reply, react, botName, timeZone } = conText;
        await react("⏱️");

        const up      = process.uptime();
        const days    = Math.floor(up / 86400);
        const hours   = Math.floor((up % 86400) / 3600);
        const minutes = Math.floor((up % 3600) / 60);
        const seconds = Math.floor(up % 60);

        let uptimeStr = "";
        if (days > 0) uptimeStr += `${days}days : `;
        uptimeStr += `${hours}hrs : ${minutes}mins : ${seconds}secs`;

        const tz  = timeZone || "Africa/Nairobi";
        const now = moment().tz(tz).format("ddd, DD MMM YYYY HH:mm:ss z");

        await reply(
`╭─⌈ ⏱️ *${botName || "ULTRA GURU"}* ⌋
│ Uptime  : *${uptimeStr}*
│ Time    : ${now}
╰⊷ *${botName || "ULTRA GURU"}*`
        );
    }
);

// ─── 5. BOTINFO / INFO ────────────────────────────────────────────────────────

gmd(
    {
        pattern: "botinfo",
        aliases: ["info", "about", "mybot"],
        react: "🤖",
        category: "general",
        description: "Show information about this bot",
    },
    async (from, Gifted, conText) => {
        const { reply, react, botName, botPrefix, botVersion,
                botMode, ownerName } = conText;
        await react("🤖");

        const { commands } = require("../guru");
        const totalCmds = commands.filter(c => c.pattern && !c.dontAddCommandList).length;
        const up = process.uptime();
        const h  = Math.floor(up / 3600);
        const m  = Math.floor((up % 3600) / 60);

        await reply(
`╭─⌈ 🤖 *${botName || "ULTRA GURU"}* ⌋
│ Version   : *v${botVersion || "5.0.0"}*
│ Prefix    : *${botPrefix || "."}*
│ Mode      : *${(botMode || "public").toUpperCase()}*
│ Commands  : *${totalCmds}*
│ Uptime    : *${h}h ${m}m*
│ Owner     : *${ownerName || "GuruTech"}*
│ Library   : Baileys
╰⊷ *${botName || "ULTRA GURU"}*`
        );
    }
);

module.exports = {};
