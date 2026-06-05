"use strict";

const { gmd, commands }        = require("../guru");
const { getSetting }           = require("../guru/database/settings");
const moment                   = require("moment-timezone");

const { buildThemedMenu, sendMenuMsg, THEMES, THEME_KEYS, buildMenuData } =
    require("./design");

const CAT_ORDER = [
    "general","ai","downloader","tools","search","games","group","owner",
    "settings","fun","converter","religion","texttools","notes","channels",
    "sports","extras","restrictions","sticker","media",
];

const CAT_ICONS = {
    general: "🌐", owner: "👑", group: "👥", ai: "🤖",
    downloader: "📥", tools: "🔧", search: "🔍", games: "🎮",
    fun: "🎉", religion: "🕌", sticker: "🖼️", converter: "🔄",
    settings: "⚙️", media: "📸", notes: "📝", channels: "📢",
    sports: "⚽", extras: "✨", texttools: "🔡", restrictions: "🚫",
};

function getSortedCats() {
    const catSummary = commands.reduce((acc, cmd) => {
        if (cmd.pattern && !cmd.dontAddCommandList) {
            const cat = (cmd.category || "general").toLowerCase();
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(cmd);
        }
        return acc;
    }, {});
    return Object.keys(catSummary).sort((a, b) => {
        const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    }).map(cat => ({ cat, cmds: catSummary[cat] }));
}

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

// ─── 2. CATEGORY COMMANDS (body handler — reply with a number) ────────────────

gmd(
    {
        pattern: /^[0-9]+$/,
        on: "body",
        dontAddCommandList: true,
        react: "📂",
        category: "general",
        description: "Reply with a category number from the menu",
    },
    async (from, Gifted, conText) => {
        const { reply, body, mek, botName, botPrefix, botFooter, newsletterJid } = conText;

        const n = parseInt(body.trim(), 10);
        const cats = getSortedCats();
        if (isNaN(n) || n < 1 || n > cats.length) return;

        const { cat, cmds } = cats[n - 1];
        const icon  = CAT_ICONS[cat] || "⚡";
        const label = (cat[0].toUpperCase() + cat.slice(1)).toUpperCase();

        const cmdList = cmds.map(c => {
            const name  = c.pattern;
            const desc  = c.description ? `— _${c.description}_` : "";
            const alts  = (c.aliases || []).length
                ? `\n│   ↳ _${c.aliases.map(a => `${botPrefix}${a}`).join(", ")}_`
                : "";
            return `│✵│▸ *${botPrefix}${name}* ${desc}${alts}`;
        }).join("\n");

        const text =
`╭───〔 ${icon} *${label} COMMANDS* 〕──┈⊷
│
${cmdList}
│
╰──────────────────────────⊷
> ✨ _${botFooter || "Powered by GURUTECH"}_`;

        try {
            await Gifted.sendMessage(from, {
                text: text.trim(),
                contextInfo: {
                    forwardingScore: 5,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: newsletterJid || "120363406649804510@newsletter",
                        newsletterName: botName || "ULTRA GURU",
                        serverMessageId: 0,
                    },
                },
            }, { quoted: mek });
        } catch {
            await reply(text);
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

        const uptime  = process.uptime();
        const days    = Math.floor(uptime / 86400);
        const hours   = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        let uptimeStr = "";
        if (days > 0) uptimeStr += `${days}days : `;
        uptimeStr += `${hours}hrs : ${minutes}mins : ${seconds}secs`;

        const tz   = timeZone || "Africa/Nairobi";
        const now  = moment().tz(tz).format("ddd, DD MMM YYYY HH:mm:ss z");

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
        const { reply, react, botName, botPrefix, botVersion, botMode,
                botFooter, ownerNumber, ownerName, newsletterJid, sender } = conText;
        await react("🤖");

        const totalCmds = commands.filter(c => c.pattern && !c.dontAddCommandList).length;
        const uptime    = process.uptime();
        const h = Math.floor(uptime / 3600);
        const m = Math.floor((uptime % 3600) / 60);

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

// ─── 6. OWNER ─────────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "owner",
        aliases: ["creator", "dev", "developer"],
        react: "👑",
        category: "general",
        description: "Get the bot owner's contact",
    },
    async (from, Gifted, conText) => {
        const { reply, react, botName, ownerNumber, ownerName } = conText;
        await react("👑");

        const num   = (ownerNumber || "254105521300").replace(/\D/g, "");
        const name  = ownerName || "GuruTech";

        try {
            const vcard =
                `BEGIN:VCARD\n` +
                `VERSION:3.0\n` +
                `FN:${name}\n` +
                `ORG:${botName || "ULTRA GURU"};\n` +
                `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\n` +
                `END:VCARD`;

            await Gifted.sendMessage(from, {
                contacts: {
                    displayName: name,
                    contacts: [{ vcard }],
                },
            }, { quoted: conText.mek });
        } catch {
            await reply(
`╭─⌈ 👑 *Owner* ⌋
│ Name   : *${name}*
│ Number : wa.me/${num}
╰⊷ *${botName || "ULTRA GURU"}*`
            );
        }
    }
);

// ─── 7. RUNTIME2 (alias guard) ────────────────────────────────────────────────

module.exports = {};
