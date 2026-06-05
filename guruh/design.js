/**
 * design.js — Bot Design & Menu Theme System
 * Commands: .setmenu, .previewmenu, .setbotpic, .setmenupic,
 *           .setfooter, .setcaption, .setbotname, .designinfo, .resetdesign
 */

"use strict";

const { gmd, commands }                          = require("../guru");
const { getSetting, setSetting, resetSetting }   = require("../guru/database/settings");
const { Jimp }                                   = require("jimp");
const { S_WHATSAPP_NET }                         = require("@whiskeysockets/baileys");
const fs   = require("fs").promises;
const path = require("path");

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400); seconds %= 86400;
    const h = Math.floor(seconds / 3600);  seconds %= 3600;
    const m = Math.floor(seconds / 60);
    return `${d}d ${h}h ${m}m`;
}

const CAT_ICONS = {
    general: "🌐", owner: "👑", group: "👥", ai: "🤖",
    downloader: "📥", tools: "🔧", search: "🔍", games: "🎮",
    fun: "🎉", religion: "🕌", sticker: "🖼️", converter: "🔄",
    settings: "⚙️", media: "📸", notes: "📝", channels: "📢",
    sports: "⚽", extras: "✨", texttools: "🔡", restrictions: "🚫",
};

const CAT_ORDER = [
    "general","ai","downloader","tools","search","games","group","owner",
    "settings","fun","converter","religion","texttools","notes","channels",
    "sports","extras","restrictions","sticker","media",
];

/**
 * getSortedCategories — single source of truth for category ordering.
 * Returns [{ cat, cmds[] }] sorted by CAT_ORDER.
 * Used by both buildMenuData (for display) and the number body handler (for lookup).
 */
function getSortedCategories() {
    const catMap = {};
    for (const cmd of commands) {
        if (!cmd.pattern || cmd.dontAddCommandList) continue;
        if (typeof cmd.pattern !== 'string') continue;
        const cat = (cmd.category || "general").toLowerCase();
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push(cmd);
    }
    return Object.keys(catMap).sort((a, b) => {
        const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
    }).map(cat => ({ cat, cmds: catMap[cat] }));
}

// ─── menu data builder ────────────────────────────────────────────────────────

async function buildMenuData(conText) {
    const {
        sender, pushName, botName, botPrefix, botVersion,
        botMode, botFooter, botCaption, newsletterJid,
    } = conText;

    const uptime   = formatUptime(Math.floor(process.uptime()));
    const totalCmds = commands.filter(c => c.pattern && !c.dontAddCommandList).length;

    // expiry
    let expiryLine   = "♾️ LIFETIME";
    let expiryDetail = "No expiry · Always active";
    try {
        const expiryRaw = await getSetting("BOT_EXPIRY_DATE");
        if (expiryRaw) {
            const exp   = new Date(expiryRaw);
            const dLeft = Math.ceil((exp - Date.now()) / 86400000);
            if      (dLeft <= 0) { expiryLine = "🔴 EXPIRED";       expiryDetail = `Ended ${exp.toDateString()}`; }
            else if (dLeft <= 7) { expiryLine = "🟡 EXPIRY SOON";   expiryDetail = `${dLeft}d left`; }
            else                 { expiryLine = "🟢 ACTIVE";        expiryDetail = `${exp.toLocaleDateString("en-GB")} (${dLeft}d left)`; }
        }
    } catch {}

    // Use getSortedCategories() — same order as body handler
    const sortedCats = getSortedCategories();

    const catLines = sortedCats.map(({ cat, cmds }, i) => {
        const icon  = CAT_ICONS[cat] || "⚡";
        const count = cmds.length;
        const label = (cat[0].toUpperCase() + cat.slice(1)).toUpperCase();
        return `> │◦➛ ${i + 1}. ${icon} ${label}  _(${count} cmds)_`;
    }).join("\n");

    return {
        sender,
        pushName: pushName || "User",
        botName:    botName    || "ULTRA GURU",
        botPrefix:  botPrefix  || ".",
        botVersion: botVersion || "5.0.0",
        botMode:    botMode    || "public",
        botFooter:  botFooter  || "Powered by GURUTECH",
        botCaption: botCaption || "",
        newsletterJid,
        uptime, totalCmds, catLines,
        expiryLine, expiryDetail,
    };
}

// ─── THEMES ───────────────────────────────────────────────────────────────────

const THEMES = {

    ultra: {
        name: "🔷 ULTRA",
        description: "Classic ULTRA GURU bordered style",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, expiryDetail, sender }) {
            return (
`╰► Hey, @${sender.split("@")[0]}
╭───〔  *${botName.toUpperCase()}*  〕──────┈⊷𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭
├──────────────────────
│✵│▸ 📊 *TOTAL COMMANDS:* ${totalCmds}
│✵│▸ ⏱️ *UPTIME:* ${uptime}
│✵│▸ ⚡ *PREFIX:* ${botPrefix}
│✵│▸ ⚙️ *MODE:* ${botMode.toUpperCase()}
│✵│▸ 📦 *VERSION:* v${botVersion}
│✵│▸ 🔑 *LICENSE:* ${expiryLine}
│✵│▸ 📅 *EXPIRY:* ${expiryDetail}
╰──────────────────────────────⊷

╭───◇ *𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗜𝗘𝗦* ◇──────┈⊷
│「 Reply with a number below 」
${catLines}
╰─────────────────────┈⊷
> ✨ _${botFooter}_`
            );
        },
    },

    neon: {
        name: "⚡ NEON",
        description: "Cyberpunk electric borders",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, sender }) {
            return (
`▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
⚡  *${botName.toUpperCase()}*  ⚡
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
👤 Hey *${sender.split("@")[0]}*
▸▸ 📊 CMDS   ⟩  ${totalCmds}
▸▸ ⏱️ UPTIME ⟩  ${uptime}
▸▸ ⚡ PREFIX ⟩  ${botPrefix}
▸▸ ⚙️ MODE   ⟩  ${botMode.toUpperCase()}
▸▸ 📦 VER    ⟩  v${botVersion}
▸▸ 🔑 LIC    ⟩  ${expiryLine}
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
⚡  *CATEGORIES* — reply a number
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
${catLines}
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
> ✨ _${botFooter}_`
            );
        },
    },

    minimal: {
        name: "🪶 MINIMAL",
        description: "Clean & simple — no decorations",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, sender }) {
            return (
`*${botName.toUpperCase()}*
────────────────
Hi @${sender.split("@")[0]} 👋
Commands: ${totalCmds}  |  Uptime: ${uptime}
Prefix: ${botPrefix}  |  Mode: ${botMode}
Version: v${botVersion}  |  License: ${expiryLine}
────────────────
*Categories* — reply a number:
${catLines}
────────────────
_${botFooter}_`
            );
        },
    },

    royal: {
        name: "👑 ROYAL",
        description: "Elegant gold-crown themed menu",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, expiryDetail, pushName }) {
            return (
`꧁༺ *${botName.toUpperCase()}* ༻꧂
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    👑 *Welcome, ${pushName}*  👑
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✦ Total Commands › *${totalCmds}*
  ✦ Uptime         › *${uptime}*
  ✦ Prefix         › *${botPrefix}*
  ✦ Mode           › *${botMode.toUpperCase()}*
  ✦ Version        › *v${botVersion}*
  ✦ License        › *${expiryLine}*
  ✦ Expiry         › _${expiryDetail}_
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 👑 *COMMAND CATEGORIES* 👑
  Reply a number to explore
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${catLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ✨ _${botFooter}_`
            );
        },
    },

    galaxy: {
        name: "🌌 GALAXY",
        description: "Space & stars themed menu",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, pushName }) {
            return (
`🌌✨━━━━━━━━━━━━━━━━━━━━━━━━✨🌌
   🚀 *${botName.toUpperCase()}*
🌌✨━━━━━━━━━━━━━━━━━━━━━━━━✨🌌
   🌟 Greetings, *${pushName}* 🌟
🌠 *Bot Stats*
  🪐 Commands ·· ${totalCmds}
  ⏳ Uptime   ·· ${uptime}
  🔭 Prefix   ·· ${botPrefix}
  🛸 Mode     ·· ${botMode.toUpperCase()}
  🌍 Version  ·· v${botVersion}
  🔑 License  ·· ${expiryLine}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌌 *WARP TO A CATEGORY*
   ↳ Reply with a number below
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${catLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 🌙 _${botFooter}_`
            );
        },
    },

    dark: {
        name: "🖤 DARK",
        description: "Dark gothic shadowed menu",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, pushName }) {
            return (
`◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
   🖤 *${botName.toUpperCase()}* 🖤
◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
 ☠️  *${pushName}* has entered the shadows
▓ Commands  › ${totalCmds}
▓ Uptime    › ${uptime}
▓ Prefix    › ${botPrefix}
▓ Mode      › ${botMode.toUpperCase()}
▓ Version   › v${botVersion}
▓ License   › ${expiryLine}
◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
 🕷️ *COMMAND CATEGORIES*
 ↳ Choose your path…
◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
${catLines}
◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢◤◢
> 🖤 _${botFooter}_`
            );
        },
    },

    flower: {
        name: "🌸 FLOWER",
        description: "Cute floral pastel theme",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, pushName }) {
            return (
`🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸
   🌷 *${botName.toUpperCase()}* 🌷
🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸
   Hi *${pushName}* ╰(✿◕‿◕✿)╯
🌻 Cmds    » ${totalCmds}
🌻 Uptime  » ${uptime}
🌻 Prefix  » ${botPrefix}
🌻 Mode    » ${botMode.toUpperCase()}
🌻 Version » v${botVersion}
🌻 License » ${expiryLine}
🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸
   🌷 *CATEGORIES* 🌷
   ~ Reply a number below ~
🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸
${catLines}
🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸🌺🌸
> 🌸 _${botFooter}_`
            );
        },
    },

    fire: {
        name: "🔥 FIRE",
        description: "Blazing hot energy theme",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, pushName }) {
            return (
`🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
 🔥 *${botName.toUpperCase()}* 🔥
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
 💥 *${pushName}*, you're on fire!
🌋 Cmds    ⟩ ${totalCmds}
🌋 Uptime  ⟩ ${uptime}
🌋 Prefix  ⟩ ${botPrefix}
🌋 Mode    ⟩ ${botMode.toUpperCase()}
🌋 Version ⟩ v${botVersion}
🌋 License ⟩ ${expiryLine}
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
 🔥 *COMMAND CATEGORIES*
 🌶️ Reply a number to ignite!
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
${catLines}
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
> 🔥 _${botFooter}_`
            );
        },
    },

    wave: {
        name: "🌊 WAVE",
        description: "Calm ocean wave theme",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, pushName }) {
            return (
`〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
   🌊 *${botName.toUpperCase()}* 🌊
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
  🐚 Riding the wave, *${pushName}*
🐠 Commands › ${totalCmds}
🐠 Uptime   › ${uptime}
🐠 Prefix   › ${botPrefix}
🐠 Mode     › ${botMode.toUpperCase()}
🐠 Version  › v${botVersion}
🐠 License  › ${expiryLine}
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
   🌊 *COMMAND CATEGORIES* 🌊
    ↯ Reply a number below ↯
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
${catLines}
〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️〰️
> 🌊 _${botFooter}_`
            );
        },
    },

    matrix: {
        name: "💻 MATRIX",
        description: "Hacker terminal matrix style",
        render({ botName, botPrefix, botVersion, botMode, botFooter,
                  uptime, totalCmds, catLines, expiryLine, sender }) {
            return (
`╔══════════════════════════════╗
║  💻 *${botName.toUpperCase()}*
╚══════════════════════════════╝
> INIT_USER :: ${sender.split("@")[0]}
> SYS_BOOT  :: COMPLETE ✅
╔══════════════════════════════╗
║ 📊 CMDS    :: ${totalCmds}
║ ⏱️ UPTIME  :: ${uptime}
║ ⌨️ PREFIX  :: ${botPrefix}
║ ⚙️ MODE    :: ${botMode.toUpperCase()}
║ 📦 VERSION :: v${botVersion}
║ 🔑 LICENSE :: ${expiryLine}
╚══════════════════════════════╝
> SELECT_MODULE :: [ reply num ]
╔══════════════════════════════╗
${catLines}
╚══════════════════════════════╝
> SYS :: _${botFooter}_`
            );
        },
    },

};

const THEME_KEYS = Object.keys(THEMES);

// ─── shared send helper ───────────────────────────────────────────────────────

async function sendMenuMsg(Gifted, from, text, conText) {
    const { mek, botName, newsletterJid, sender } = conText;
    const picUrl = (await getSetting("BOT_PIC")) || conText.botPic;
    try {
        await Gifted.sendMessage(from, {
            image: { url: picUrl },
            caption: text.trim(),
            contextInfo: {
                mentionedJid: [sender],
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
        // fallback to text-only if image fails
        await Gifted.sendMessage(from, { text: text.trim() }, { quoted: mek });
    }
}

// ─── 1. SETMENU ───────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setmenu",
        aliases: ["menutheme", "menudesign", "themenu"],
        react: "🎨",
        category: "owner",
        description: "Change the bot menu design. Usage: .setmenu [1-10] or .setmenu to list",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, args, botFooter } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        const current = (await getSetting("MENU_THEME")) || "ultra";

        // No arg → list all themes
        if (!args[0]) {
            const list = THEME_KEYS.map((key, i) => {
                const t   = THEMES[key];
                const cur = key === current ? " ✅ *[ACTIVE]*" : "";
                return `*${i + 1}.* ${t.name}${cur}\n   _${t.description}_`;
            }).join("\n\n");

            return reply(
`╭──〔 🎨 *MENU THEMES* 〕──────┈⊷
│ *${THEME_KEYS.length}* themes available
│ Current: *${THEMES[current]?.name || current}*
│
│ *.setmenu <number>* — switch theme
│ *.previewmenu <number>* — preview first
╰────────────────────────────⊷

${list}

> _${botFooter}_`
            );
        }

        const n = parseInt(args[0], 10);
        if (isNaN(n) || n < 1 || n > THEME_KEYS.length) {
            await react("❌");
            return reply(`❌ Enter a number between 1 and ${THEME_KEYS.length}.\nSend *.setmenu* to see all themes.`);
        }

        const key = THEME_KEYS[n - 1];
        await setSetting("MENU_THEME", key);
        await react("⏳");

        const data = await buildMenuData(conText);
        const text = `✅ *Theme switched to ${THEMES[key].name}!*\n\nHere's a preview:\n\n${THEMES[key].render(data)}`;
        await sendMenuMsg(Gifted, from, text, conText);
        await react("✅");
    }
);

// ─── 2. PREVIEWMENU ───────────────────────────────────────────────────────────

gmd(
    {
        pattern: "previewmenu",
        aliases: ["menupreview", "prevmenu"],
        react: "👁️",
        category: "owner",
        description: "Preview a menu theme without switching. Usage: .previewmenu <1-10>",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, args } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        const n = parseInt(args[0], 10);
        if (isNaN(n) || n < 1 || n > THEME_KEYS.length) {
            await react("❌");
            return reply(`❌ Usage: .previewmenu <1-${THEME_KEYS.length}>\nSend *.setmenu* to see the list.`);
        }

        const key  = THEME_KEYS[n - 1];
        const data = await buildMenuData(conText);
        const text = `👁️ *Preview — ${THEMES[key].name}*\n_(Not applied. Send .setmenu ${n} to apply.)_\n\n${THEMES[key].render(data)}`;
        await sendMenuMsg(Gifted, from, text, conText);
        await react("✅");
    }
);

// ─── 3. SETBOTPIC ─────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setbotpic",
        aliases: ["botpic", "changebotpic", "botimage"],
        react: "🖼️",
        category: "owner",
        description: "Change the bot WhatsApp profile picture. Quote an image or send a URL.",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, quoted, quotedMsg, q } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        // resolve quoted image — quotedMsg is the raw message object from serializer
        const quotedImg = quotedMsg?.imageMessage
            || quoted?.imageMessage
            || quoted?.message?.imageMessage
            || null;

        const hasUrl = q && q.trim().startsWith("http");

        if (!quotedImg && !hasUrl) {
            await react("❌");
            return reply(
                "❌ Please quote an image *or* provide a URL!\n\n" +
                "Examples:\n" +
                "• Quote an image → send *.setbotpic*\n" +
                "• *.setbotpic https://example.com/photo.jpg*"
            );
        }

        await react("⏳");
        let tempPath = null;

        try {
            let imageBuffer;

            if (quotedImg) {
                tempPath = await Gifted.downloadAndSaveMediaMessage(quotedImg, "temp_botpic");
                const img = await Jimp.read(tempPath);
                img.scaleToFit({ w: 720, h: 720 });
                imageBuffer = await img.getBuffer("image/jpeg");
            } else {
                const img = await Jimp.read(q.trim());
                img.scaleToFit({ w: 720, h: 720 });
                imageBuffer = await img.getBuffer("image/jpeg");
            }

            // Update WhatsApp profile picture
            await Gifted.query({
                tag: "iq",
                attrs: { to: S_WHATSAPP_NET, type: "set", xmlns: "w:profile:picture" },
                content: [{ tag: "picture", attrs: { type: "image" }, content: imageBuffer }],
            });

            // Save URL to BOT_PIC so menu image updates too
            if (hasUrl) await setSetting("BOT_PIC", q.trim());

            await react("✅");
            await reply("✅ Bot profile picture updated!\nThe menu image has also been updated.");
        } catch (error) {
            await react("❌");
            await reply(`❌ Failed to update picture: ${error.message}`);
        } finally {
            if (tempPath) await fs.unlink(tempPath).catch(() => {});
        }
    }
);

// ─── 4. SETMENUPIC ────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setmenupic",
        aliases: ["menupic", "menuimage", "setmenuimg"],
        react: "🖼️",
        category: "owner",
        description: "Set the image shown in .menu. Usage: .setmenupic <URL> or quote an image.",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, quoted, quotedMsg, q } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        const quotedImg = quotedMsg?.imageMessage
            || quoted?.imageMessage
            || quoted?.message?.imageMessage
            || null;

        const hasUrl = q && q.trim().startsWith("http");

        if (!quotedImg && !hasUrl) {
            await react("❌");
            return reply(
                "❌ Please quote an image *or* provide a URL!\n\n" +
                "Examples:\n" +
                "• Quote an image → send *.setmenupic*\n" +
                "• *.setmenupic https://example.com/banner.jpg*"
            );
        }

        await react("⏳");
        let tempPath = null;

        try {
            let finalUrl;

            if (hasUrl) {
                finalUrl = q.trim();
            } else {
                // Download, re-upload to catbox
                const { uploadToCatbox } = require("../guru");
                tempPath = await Gifted.downloadAndSaveMediaMessage(quotedImg, "temp_menupic");
                finalUrl = await uploadToCatbox(tempPath);
                if (!finalUrl) throw new Error("Upload to catbox failed — try a URL instead.");
            }

            await setSetting("BOT_PIC", finalUrl);
            await react("✅");
            await reply(`✅ Menu image updated!\n\nURL: ${finalUrl}\n\nSend *.menu* to see the result.`);
        } catch (error) {
            await react("❌");
            await reply(`❌ Failed: ${error.message}`);
        } finally {
            if (tempPath) await fs.unlink(tempPath).catch(() => {});
        }
    }
);

// ─── 5. SETFOOTER ─────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setfooter",
        aliases: ["footer", "botfooter", "changefooter"],
        react: "✏️",
        category: "owner",
        description: "Change the bot footer shown in menus. Usage: .setfooter <text>",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, q } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        if (!q || !q.trim()) {
            await react("❌");
            const cur = (await getSetting("FOOTER")) || "Not set";
            return reply(`❌ Provide footer text!\n\nCurrent: _${cur}_\n\nExample: *.setfooter Powered by ULTRA-GURU 🔥*`);
        }

        await setSetting("FOOTER", q.trim());
        await react("✅");
        return reply(`✅ Footer updated to:\n\n_${q.trim()}_`);
    }
);

// ─── 6. SETCAPTION ────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setcaption",
        aliases: ["caption", "botcaption", "changecaption"],
        react: "✏️",
        category: "owner",
        description: "Change the bot caption/tagline. Usage: .setcaption <text>",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, q } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        if (!q || !q.trim()) {
            await react("❌");
            const cur = (await getSetting("CAPTION")) || "Not set";
            return reply(`❌ Provide a caption!\n\nCurrent: _${cur}_\n\nExample: *.setcaption ⚡ ULTRA GURU | Ultra Fast*`);
        }

        await setSetting("CAPTION", q.trim());
        await react("✅");
        return reply(`✅ Caption updated to:\n\n_${q.trim()}_`);
    }
);

// ─── 7. SETBOTNAME ────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "setbotname",
        aliases: ["botname", "namebot", "changename", "renamebot"],
        react: "✏️",
        category: "owner",
        description: "Change the bot display name in menus. Usage: .setbotname <name>",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser, q } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        if (!q || !q.trim()) {
            await react("❌");
            const cur = (await getSetting("BOT_NAME")) || "ULTRA GURU";
            return reply(`❌ Provide a name!\n\nCurrent: *${cur}*\n\nExample: *.setbotname MY GURU BOT*`);
        }

        await setSetting("BOT_NAME", q.trim());

        // Also try to update WhatsApp profile name
        try { await Gifted.updateProfileName(q.trim()); } catch {}

        await react("✅");
        return reply(`✅ Bot name set to: *${q.trim()}*\n_(WhatsApp profile name also updated)_`);
    }
);

// ─── 8. DESIGNINFO ────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "designinfo",
        aliases: ["mydesign", "designstatus", "currentdesign"],
        react: "🎨",
        category: "owner",
        description: "Show current bot design settings.",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        const [theme, pic, footer, caption, name] = await Promise.all([
            getSetting("MENU_THEME"),
            getSetting("BOT_PIC"),
            getSetting("FOOTER"),
            getSetting("CAPTION"),
            getSetting("BOT_NAME"),
        ]);

        const themeKey  = theme || "ultra";
        const themeName = THEMES[themeKey]?.name || themeKey;
        const themeNum  = THEME_KEYS.indexOf(themeKey) + 1;
        const picShort  = (pic || "Not set").length > 55
            ? (pic || "").slice(0, 52) + "..."
            : (pic || "Not set");

        await react("✅");
        return reply(
`╭──〔 🎨 *BOT DESIGN SETTINGS* 〕──
│
│ *Menu Theme:* ${themeName} (${themeNum}/${THEME_KEYS.length})
│ *Bot Name:* ${name || "ULTRA GURU"}
│ *Footer:*   _${footer || "Not set"}_
│ *Caption:*  _${caption || "Not set"}_
│ *Menu Pic:* ${picShort}
│
╰──────────────────────────────⊷

*Commands:*
• *.setmenu* — browse & switch themes
• *.previewmenu <n>* — preview a theme
• *.setbotname <text>* — change bot name
• *.setbotpic* — change profile + menu image
• *.setmenupic* — change menu image only
• *.setfooter <text>* — change footer
• *.setcaption <text>* — change caption
• *.resetdesign* — reset all to defaults`
        );
    }
);

// ─── 9. RESETDESIGN ───────────────────────────────────────────────────────────

const _resetConfirm = new Map();

gmd(
    {
        pattern: "resetdesign",
        aliases: ["designreset", "resettheme"],
        react: "🔄",
        category: "owner",
        description: "Reset all bot design settings to defaults. Run twice to confirm.",
    },
    async (from, Gifted, conText) => {
        const { reply, react, isSuperUser } = conText;

        if (!isSuperUser) { await react("❌"); return reply("❌ Owner Only Command!"); }

        const now     = Date.now();
        const pending = _resetConfirm.get(from);

        if (!pending || now - pending > 25_000) {
            _resetConfirm.set(from, now);
            await react("⚠️");
            return reply(
                "⚠️ *Reset Confirmation*\n\n" +
                "This will reset:\n• Menu theme → ultra\n• Bot name → default\n• Footer, caption, pic → defaults\n\n" +
                "Send *.resetdesign* again within *25 seconds* to confirm."
            );
        }

        _resetConfirm.delete(from);

        await Promise.all([
            resetSetting("MENU_THEME"),
            resetSetting("BOT_PIC"),
            resetSetting("FOOTER"),
            resetSetting("CAPTION"),
            resetSetting("BOT_NAME"),
        ]);

        await react("✅");
        return reply("✅ All design settings reset to defaults!\n\nSend *.menu* to see the result.");
    }
);

// ─── exported for general.js ──────────────────────────────────────────────────

async function buildThemedMenu(conText, Gifted) {
    const themeKey = (await getSetting("MENU_THEME")) || "ultra";
    const theme    = THEMES[themeKey] || THEMES.ultra;
    const data     = await buildMenuData(conText);
    return theme.render(data);
}

module.exports = { buildThemedMenu, THEMES, THEME_KEYS, buildMenuData, sendMenuMsg, getSortedCategories, CAT_ICONS };
