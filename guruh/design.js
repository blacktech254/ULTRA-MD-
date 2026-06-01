/**
 * design.js — Bot Design & Menu Theme System
 *
 * Commands:
 *  .setmenu           — show all available menu themes
 *  .setmenu <n>       — switch to theme n
 *  .previewmenu <n>   — preview a theme without switching
 *  .setbotpic         — change bot picture (URL or quote image)
 *  .setfooter         — change footer text
 *  .setcaption        — change caption/tagline text
 *  .setmenupic        — change the image shown in .menu (URL or quote)
 *  .resetdesign       — reset all design settings to defaults
 *  .designinfo        — show current design settings
 */

"use strict";

const { gmd, commands } = require("../guru");
const { getSetting, setSetting, resetSetting } = require("../guru/database/settings");
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

function getCatSummary(commands) {
  return commands.reduce((acc, cmd) => {
    if (cmd.pattern && !cmd.dontAddCommandList) {
      const cat = cmd.category || "general";
      acc[cat] = (acc[cat] || 0) + 1;
    }
    return acc;
  }, {});
}

const CAT_ICONS = {
  general: "🌐", owner: "👑", group: "👥", ai: "🤖",
  downloader: "📥", tools: "🔧", search: "🔍", games: "🎮",
  fun: "🎉", religion: "🕌", sticker: "🖼️", converter: "🔄",
  settings: "⚙️", media: "📸",
};

// ─── THEME DEFINITIONS ────────────────────────────────────────────────────────
// Each theme is a function: (data) => string
// data = { botName, botPrefix, botVersion, botMode, botFooter, botCaption,
//          uptime, totalCmds, catSummary, pushName, sender,
//          expiryLine, expiryDetail, catLines }

const THEMES = {

  // ── 1. ULTRA (default, current style) ───────────────────────────────────────
  ultra: {
    name: "🔷 ULTRA",
    description: "The classic ULTRA GURU bordered style",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, expiryDetail, sender, pushName, botCaption }) {
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

  // ── 2. NEON — electric/cyberpunk vibe ──────────────────────────────────────
  neon: {
    name: "⚡ NEON",
    description: "Cyberpunk electric borders",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, expiryDetail, sender, pushName }) {
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

  // ── 3. MINIMAL — clean no-nonsense ─────────────────────────────────────────
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
Version: v${botVersion}
License: ${expiryLine}
────────────────
*Categories* — reply a number:
${catLines}
────────────────
_${botFooter}_`
      );
    },
  },

  // ── 4. ROYAL — elegant crown style ─────────────────────────────────────────
  royal: {
    name: "👑 ROYAL",
    description: "Elegant gold-crown themed menu",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, expiryDetail, sender, pushName }) {
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

  // ── 5. GALAXY — space-themed ────────────────────────────────────────────────
  galaxy: {
    name: "🌌 GALAXY",
    description: "Space & stars themed menu",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
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

  // ── 6. DARK — dark/gothic style ─────────────────────────────────────────────
  dark: {
    name: "🖤 DARK",
    description: "Dark gothic shadowed menu",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
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

  // ── 7. FLOWER — cute/feminine style ─────────────────────────────────────────
  flower: {
    name: "🌸 FLOWER",
    description: "Cute floral pastel theme",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
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

  // ── 8. FIRE — blazing energy theme ─────────────────────────────────────────
  fire: {
    name: "🔥 FIRE",
    description: "Blazing hot energy theme",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
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

  // ── 9. WAVE — ocean vibes ───────────────────────────────────────────────────
  wave: {
    name: "🌊 WAVE",
    description: "Calm ocean wave theme",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
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

  // ── 10. MATRIX — hacker code style ─────────────────────────────────────────
  matrix: {
    name: "💻 MATRIX",
    description: "Hacker terminal matrix style",
    render({ botName, botPrefix, botVersion, botMode, botFooter,
             uptime, totalCmds, catLines, expiryLine, sender, pushName }) {
      return (
`╔══════════════════════════════╗
║  💻 *${botName.toUpperCase()}*
╚══════════════════════════════╝
> INIT_USER :: ${sender.split("@")[0]}
> SYS_BOOT  :: COMPLETE ✅
╔══════════════════════════════╗
║ 📊 CMDS    :: ${totalCmds}
║ ⏱️ UPTIME  :: ${uptime}
║ ⌨️  PREFIX  :: ${botPrefix}
║ ⚙️  MODE    :: ${botMode.toUpperCase()}
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

// ─── shared menu builder ──────────────────────────────────────────────────────

async function buildMenuData(conText) {
  const {
    sender, pushName, botName, botPrefix, botVersion, botMode,
    botFooter, botCaption, newsletterJid,
  } = conText;

  const uptime = formatUptime(Math.floor(process.uptime()));
  const totalCmds = commands.filter(c => c.pattern && !c.dontAddCommandList).length;

  // expiry
  let expiryLine   = "♾️  LIFETIME";
  let expiryDetail = "No expiry · Always active";
  try {
    const expiryRaw = await getSetting("BOT_EXPIRY_DATE");
    if (expiryRaw) {
      const exp  = new Date(expiryRaw);
      const now  = new Date();
      const dLeft = Math.ceil((exp - now) / 86400000);
      if (dLeft <= 0) {
        expiryLine   = "🔴 EXPIRED";
        expiryDetail = `Ended · ${exp.toDateString()}`;
      } else if (dLeft <= 7) {
        expiryLine   = "🟡 EXPIRY SOON";
        expiryDetail = `${dLeft}d left`;
      } else {
        expiryLine   = "🟢 ACTIVE";
        expiryDetail = `${exp.toLocaleDateString("en-GB")} (${dLeft}d left)`;
      }
    }
  } catch {}

  // categories
  const catSummary = getCatSummary(commands);
  const sorted = Object.entries(catSummary).sort(([, a], [, b]) => b - a);
  const catLines = sorted.map(([cat, count], i) => {
    const icon  = CAT_ICONS[cat.toLowerCase()] || "⚡";
    const label = (cat.charAt(0).toUpperCase() + cat.slice(1)).toUpperCase();
    return `> │◦➛ ${i + 1}. ${icon} ${label}  _(${count} cmds)_`;
  }).join("\n");

  return {
    sender, pushName,
    botName:    botName  || "ULTRA GURU",
    botPrefix:  botPrefix || ".",
    botVersion: botVersion || "5.0.0",
    botMode:    botMode   || "public",
    botFooter:  botFooter || "Powered by GURUTECH",
    botCaption: botCaption || "",
    newsletterJid,
    uptime, totalCmds,
    catSummary, catLines,
    expiryLine, expiryDetail,
  };
}

// ─── 1. SETMENU — show themes or switch ──────────────────────────────────────

gmd(
  {
    pattern: "setmenu",
    aliases: ["menutheme", "menudesign", "themenu"],
    react: "🎨",
    category: "owner",
    description:
      "Change the bot menu design theme. Usage: .setmenu [1-10] or .setmenu to list all themes",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, args, mek, botFooter, botPic } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    const currentTheme = (await getSetting("MENU_THEME")) || "ultra";

    // No args → show theme gallery
    if (!args[0]) {
      const themeList = THEME_KEYS.map((key, i) => {
        const t   = THEMES[key];
        const cur = key === currentTheme ? " ✅ *[ACTIVE]*" : "";
        return `*${i + 1}.* ${t.name}${cur}\n   _${t.description}_`;
      }).join("\n\n");

      const msg =
`╭──〔 🎨 *MENU THEMES* 〕──────┈⊷
│ There are *${THEME_KEYS.length}* themes available.
│ Current: *${THEMES[currentTheme]?.name || currentTheme}*
│
│ Send *.setmenu <number>* to switch.
│ Send *.previewmenu <number>* to preview first.
╰────────────────────────────⊷

${themeList}

> _${botFooter}_`;

      return reply(msg);
    }

    // Numeric arg → switch theme
    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > THEME_KEYS.length) {
      await react("❌");
      return reply(`❌ Please provide a number between 1 and ${THEME_KEYS.length}.\nSend *.setmenu* to see all themes.`);
    }

    const key = THEME_KEYS[n - 1];
    await setSetting("MENU_THEME", key);
    await react("✅");

    // Preview the new theme immediately
    const data = await buildMenuData(conText);
    const text = THEMES[key].render(data);

    const botPicUrl = (await getSetting("BOT_PIC")) || botPic;

    try {
      await Gifted.sendMessage(from, {
        image: { url: botPicUrl },
        caption: `✅ *Theme switched to ${THEMES[key].name}!*\n\nHere's a preview:\n\n${text}`,
        contextInfo: {
          mentionedJid: [data.sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: data.newsletterJid,
            newsletterName: data.botName,
            serverMessageId: 0,
          },
        },
      }, { quoted: mek });
    } catch {
      await reply(`✅ Theme switched to *${THEMES[key].name}*!\n\nPreview:\n\n${text}`);
    }
  }
);

// ─── 2. PREVIEWMENU — preview without switching ───────────────────────────────

gmd(
  {
    pattern: "previewmenu",
    aliases: ["menupreview", "prevmenu", "thempreview"],
    react: "👁️",
    category: "owner",
    description:
      "Preview any menu theme without switching. Usage: .previewmenu <1-10>",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, args, mek, botPic } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    const n = parseInt(args[0], 10);
    if (isNaN(n) || n < 1 || n > THEME_KEYS.length) {
      await react("❌");
      return reply(`❌ Usage: .previewmenu <1-${THEME_KEYS.length}>\nSend *.setmenu* to see the full list.`);
    }

    const key  = THEME_KEYS[n - 1];
    const data = await buildMenuData(conText);
    const text = THEMES[key].render(data);

    const botPicUrl = (await getSetting("BOT_PIC")) || botPic;

    try {
      await Gifted.sendMessage(from, {
        image: { url: botPicUrl },
        caption: `👁️ *Preview — ${THEMES[key].name}*\n_(Not applied yet. Send .setmenu ${n} to apply.)_\n\n${text}`,
        contextInfo: {
          mentionedJid: [data.sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: data.newsletterJid,
            newsletterName: data.botName,
            serverMessageId: 0,
          },
        },
      }, { quoted: mek });
    } catch {
      await reply(`👁️ *Preview — ${THEMES[key].name}*\n\n${text}`);
    }

    await react("✅");
  }
);

// ─── 3. SETBOTPIC — change bot WhatsApp profile picture ──────────────────────

gmd(
  {
    pattern: "setbotpic",
    aliases: ["botpic", "changebotpic", "botimage"],
    react: "🖼️",
    category: "owner",
    description:
      "Change the bot's WhatsApp profile picture. Quote an image or provide a URL. Also updates the menu image.",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, quoted, q, mek } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    let imageUrl = null;
    let tempPath = null;

    try {
      // Option A: quoted image
      const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
      if (quotedImg) {
        tempPath = await Gifted.downloadAndSaveMediaMessage(quotedImg, "temp_botpic");
        imageUrl = null; // will use tempPath
      } else if (q && q.trim().startsWith("http")) {
        // Option B: URL
        imageUrl = q.trim();
      } else {
        await react("❌");
        return reply(
          "❌ Please quote an image *or* provide a URL!\n\n" +
          "Examples:\n" +
          "• Quote an image and send *.setbotpic*\n" +
          "• *.setbotpic https://example.com/photo.jpg*"
        );
      }

      await react("⏳");

      // Update BOT_PIC setting (used in menu image)
      const picRef = tempPath || imageUrl;
      await setSetting("BOT_PIC", imageUrl || `file://${tempPath}`);

      // Update WhatsApp profile picture (try full-image method)
      const { Jimp } = require("jimp");
      const img = tempPath
        ? await Jimp.read(tempPath)
        : await Jimp.read(imageUrl);
      img.scaleToFit({ w: 720, h: 720 });
      const imageBuffer = await img.getBuffer("image/jpeg");

      await Gifted.query({
        tag: "iq",
        attrs: {
          to: require("@whiskeysockets/baileys").S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture",
        },
        content: [
          { tag: "picture", attrs: { type: "image" }, content: imageBuffer },
        ],
      });

      // Also update BOT_PIC to the URL (if URL provided) for menu rendering
      if (imageUrl) await setSetting("BOT_PIC", imageUrl);

      await react("✅");
      await reply("✅ Bot profile picture updated!\nThe menu image has also been updated.");
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to update picture: ${error.message}`);
    } finally {
      if (tempPath) {
        try { await fs.unlink(tempPath); } catch {}
      }
    }
  }
);

// ─── 4. SETMENUPIC — change only the menu image URL ──────────────────────────

gmd(
  {
    pattern: "setmenupic",
    aliases: ["menupic", "menuimage", "setmenuimg"],
    react: "🖼️",
    category: "owner",
    description:
      "Set the image shown in .menu/.menus. Usage: .setmenupic <URL> or quote an image.",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, quoted, q, mek } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    let imageUrl = null;
    let tempPath = null;

    try {
      const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
      if (quotedImg) {
        tempPath = await Gifted.downloadAndSaveMediaMessage(quotedImg, "temp_menupic");
        // Upload to catbox or use GiftedCDN
        const { uploadToCatbox } = require("../guru");
        imageUrl = await uploadToCatbox(tempPath);
        if (!imageUrl) throw new Error("Upload failed — try a URL instead.");
      } else if (q && q.trim().startsWith("http")) {
        imageUrl = q.trim();
      } else {
        await react("❌");
        return reply(
          "❌ Please quote an image *or* provide a URL!\n\n" +
          "Examples:\n" +
          "• Quote an image and send *.setmenupic*\n" +
          "• *.setmenupic https://example.com/banner.jpg*"
        );
      }

      await setSetting("BOT_PIC", imageUrl);
      await react("✅");
      await reply(`✅ Menu image updated!\n\nNew URL: ${imageUrl}\n\nSend *.menu* to see the result.`);
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to update menu image: ${error.message}`);
    } finally {
      if (tempPath) {
        try { await fs.unlink(tempPath); } catch {}
      }
    }
  }
);

// ─── 5. SETFOOTER — change the footer/tagline ────────────────────────────────

gmd(
  {
    pattern: "setfooter",
    aliases: ["footer", "botfooter", "changefooter"],
    react: "✏️",
    category: "owner",
    description: "Change the bot footer text shown in menus. Usage: .setfooter <text>",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, q } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    if (!q || !q.trim()) {
      await react("❌");
      const cur = (await getSetting("FOOTER")) || "Not set";
      return reply(`❌ Please provide footer text!\n\nCurrent: _${cur}_\n\nExample: .setfooter Powered by ULTRA-GURU 🔥`);
    }

    await setSetting("FOOTER", q.trim());
    await react("✅");
    return reply(`✅ Footer updated to:\n\n_${q.trim()}_`);
  }
);

// ─── 6. SETCAPTION — change the caption/tagline ───────────────────────────────

gmd(
  {
    pattern: "setcaption",
    aliases: ["caption", "botcaption", "changecaption"],
    react: "✏️",
    category: "owner",
    description: "Change the bot caption/tagline text. Usage: .setcaption <text>",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, q } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    if (!q || !q.trim()) {
      await react("❌");
      const cur = (await getSetting("CAPTION")) || "Not set";
      return reply(`❌ Please provide a caption!\n\nCurrent: _${cur}_\n\nExample: .setcaption ⚡ ULTRA GURU Premium | Ultra Fast`);
    }

    await setSetting("CAPTION", q.trim());
    await react("✅");
    return reply(`✅ Caption updated to:\n\n_${q.trim()}_`);
  }
);

// ─── 7. SETBOTNAME — update BOT_NAME in DB ───────────────────────────────────

gmd(
  {
    pattern: "setbotname",
    aliases: ["botname", "namebot", "changename", "renambot"],
    react: "✏️",
    category: "owner",
    description: "Change the bot's display name used in menus. Usage: .setbotname <name>",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, q } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    if (!q || !q.trim()) {
      await react("❌");
      const cur = (await getSetting("BOT_NAME")) || "ULTRA GURU";
      return reply(`❌ Please provide a name!\n\nCurrent: *${cur}*\n\nExample: .setbotname MY COOL BOT`);
    }

    await setSetting("BOT_NAME", q.trim());

    // Also update WhatsApp profile name
    try {
      await Gifted.updateProfileName(q.trim());
    } catch {}

    await react("✅");
    return reply(`✅ Bot name set to: *${q.trim()}*\n\nWhatsApp profile name also updated.`);
  }
);

// ─── 8. DESIGNINFO — show current design settings ───────────────────────────

gmd(
  {
    pattern: "designinfo",
    aliases: ["mydesign", "designstatus", "currentdesign"],
    react: "🎨",
    category: "owner",
    description: "Show all current bot design/branding settings.",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    const [theme, pic, footer, caption, name] = await Promise.all([
      getSetting("MENU_THEME"),
      getSetting("BOT_PIC"),
      getSetting("FOOTER"),
      getSetting("CAPTION"),
      getSetting("BOT_NAME"),
    ]);

    const themeKey = theme || "ultra";
    const themeName = THEMES[themeKey]?.name || themeKey;

    const picDisplay = (pic || "").length > 60 ? pic.slice(0, 57) + "..." : (pic || "Not set");

    const msg =
`╭──〔 🎨 *BOT DESIGN SETTINGS* 〕──
│
│ *Menu Theme:* ${themeName}
│   (${THEME_KEYS.indexOf(themeKey) + 1} of ${THEME_KEYS.length} — change with .setmenu)
│
│ *Bot Name:* ${name || "ULTRA GURU"}
│ *Footer:*   _${footer || "Not set"}_
│ *Caption:*  _${caption || "Not set"}_
│ *Menu Pic:* ${picDisplay}
│
╰──────────────────────────────⊷

*Commands:*
• *.setmenu* — browse & change themes
• *.setbotname* — change bot name
• *.setbotpic* — change profile/menu image
• *.setmenupic* — change menu image only
• *.setfooter* — change footer text
• *.setcaption* — change caption text
• *.resetdesign* — reset all to defaults`;

    await reply(msg);
    await react("✅");
  }
);

// ─── 9. RESETDESIGN — reset all design settings ──────────────────────────────

const resetDesignConfirm = new Map();

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

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    const now = Date.now();
    const pending = resetDesignConfirm.get(from);

    if (!pending || now - pending > 25_000) {
      resetDesignConfirm.set(from, now);
      await react("⚠️");
      return reply(
        "⚠️ *Reset Confirmation*\n\nThis will reset:\n• Menu theme → ultra\n• Bot name → ULTRA GURU\n• Footer, caption, picture → defaults\n\nSend *.resetdesign* again within *25 seconds* to confirm."
      );
    }

    resetDesignConfirm.delete(from);

    await Promise.all([
      resetSetting("MENU_THEME"),
      resetSetting("BOT_PIC"),
      resetSetting("FOOTER"),
      resetSetting("CAPTION"),
      resetSetting("BOT_NAME"),
    ]);

    await react("✅");
    return reply("✅ All design settings reset to defaults!\n\nSend *.menu* to see the default look.");
  }
);

// ─── 10. Re-export THEMES for use by general.js menu command ─────────────────
// general.js should call: const { getMenuThemeRenderer } = require("./design");
// and then use: const renderer = await getMenuThemeRenderer(); renderer(data);
// But since plugins can't easily share exports, we patch via the settings key.
// The .menu command in general.js needs to be updated to read MENU_THEME and
// use the matching renderer — see the patch instructions in the comment below.

/**
 * HOW TO PATCH general.js .menu command:
 *
 * Replace the `menuText = \`...\`` block in both the main .menu handler and
 * the body "0" handler with:
 *
 *   const { buildThemedMenu } = require("./design");
 *   const menuText = await buildThemedMenu(conText, Gifted);
 *
 * This function is exported below and handles all theme rendering.
 */

/** Called by the patched .menu and .menus commands in general.js */
async function buildThemedMenu(conText, Gifted) {
  const themeKey = (await getSetting("MENU_THEME")) || "ultra";
  const theme    = THEMES[themeKey] || THEMES.ultra;
  const data     = await buildMenuData(conText);
  return theme.render(data);
}

/**
 * Returns category names sorted exactly as they appear in the menu
 * (by command count descending, same as buildMenuData catLines).
 * Use this in any handler that resolves a user's numeric reply to a category.
 */
function getMenuCategoryOrder(cmds) {
  const catSummary = getCatSummary(cmds);
  return Object.entries(catSummary)
    .sort(([, a], [, b]) => b - a)
    .map(([cat]) => cat);
}

module.exports = { buildThemedMenu, THEMES, THEME_KEYS, buildMenuData, getMenuCategoryOrder };
