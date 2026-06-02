const { gmd, commands, monospace, formatBytes } = require("../guru"),
  fs = require("fs"),
  axios = require("axios"),
  BOT_START_TIME = Date.now(),
  { totalmem: totalMemoryBytes, freemem: freeMemoryBytes } = require("os"),
  moment = require("moment-timezone"),
  more = String.fromCharCode(8206),
  readmore = more.repeat(4001),
  ram = `${formatBytes(freeMemoryBytes)} / ${formatBytes(totalMemoryBytes)}`;

// ── Serif Italic runtime converter ─────────────────────────────────────────
const _SI_FROM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const _SI_TO   = '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻';
const si = (str) => [...(str || '')].map(c => {
  const idx = _SI_FROM.indexOf(c);
  return idx >= 0 ? [..._SI_TO][idx] : c;
}).join('');
// ───────────────────────────────────────────────────────────────────────────

const { sendButtons } = require("gifted-btns");

gmd(
  {
    pattern: "ping",
    aliases: ["pi", "p"],
    react: "⚡",
    category: "general",
    description: "Check bot response speed",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      react,
      newsletterJid,
      newsletterUrl,
      botFooter,
      botName,
      botPrefix,
    } = conText;
    const startTime = process.hrtime();

    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(80 + Math.random() * 420)),
    );

    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor(elapsed[0] * 1000 + elapsed[1] / 1000000);

    const quality = responseTime < 100 ? "🟢 Excellent" : responseTime < 300 ? "🟡 Good" : "🔴 Slow";
    const totalBars = 10;
    const filled = Math.max(1, Math.round((1 - Math.min(responseTime, 1000) / 1000) * totalBars));
    const bar = "▓".repeat(filled) + "░".repeat(totalBars - filled);
    const pct = Math.round((1 - Math.min(responseTime, 1000) / 1000) * 100);

    await sendButtons(Gifted, from, {
      title: "",
      text:
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  ⚡ *${(botName || "ULTRA GURU MD").toUpperCase()}* ⚡
       _Ping & Response Check_
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂

  🏓 *Response* ›  ${monospace(responseTime + "ms")}
  📶 *Signal*   ›  ${bar} ${pct}%
  ${quality} *Network Quality*
  🔰 *Status*   ›  Online & Ready`,
      footer: `> ✨ _${botFooter}_`,
      buttons: [
        { id: `${botPrefix}uptime`, text: "⏱️ Uptime" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "WaChannel",
            url: newsletterUrl,
          }),
        },
      ],
    });

    await react("✅");
  },
);

gmd(
  {
    pattern: "report",
    aliases: ["request"],
    react: "💫",
    description: "Request New Features.",
    category: "owner",
  },
  async (from, Gifted, conText) => {
    const { mek, q, sender, react, pushName, botPrefix, isSuperUser, reply } =
      conText;
    const reportedMessages = {};
    const devlopernumber = "254799916673";
    try {
      if (!isSuperUser) return reply("*Owner Only Command*");
      if (!q)
        return reply(
          `Example: ${botPrefix}request hi dev downloader commands are not working`,
        );
      const messageId = mek.key.id;
      if (reportedMessages[messageId]) {
        return reply(
          "This report has already been forwarded to the owner. Please wait for a response.",
        );
      }
      reportedMessages[messageId] = true;
      const textt = `*| REQUEST/REPORT |*`;
      const teks1 = `\n\n*User*: @${sender.split("@")[0]}\n*Request:* ${q}`;
      Gifted.sendMessage(
        devlopernumber + "@s.whatsapp.net",
        {
          text: textt + teks1,
          mentions: [sender],
        },
        {
          quoted: mek,
        },
      );
      reply(
        "Tʜᴀɴᴋ ʏᴏᴜ ꜰᴏʀ ʏᴏᴜʀ ʀᴇᴘᴏʀᴛ. Iᴛ ʜᴀs ʙᴇᴇɴ ꜰᴏʀᴡᴀʀᴅᴇᴅ ᴛᴏ ᴛʜᴇ ᴏᴡɴᴇʀ. Pʟᴇᴀsᴇ ᴡᴀɪᴛ ꜰᴏʀ ᴀ ʀᴇsᴘᴏɴsᴇ.",
      );
      await react("✅");
    } catch (e) {
      reply(e);
      console.log(e);
    }
  },
);

gmd(
  {
    pattern: "menus",
    aliases: ["mainmenu", "mainmens"],
    description: "Display Bot's Uptime, Date, Time, and Other Stats",
    react: "📜",
    category: "general",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
      ownerNumber,
    } = conText;
    try {
      const { getSetting } = require("../guru/database/settings");

      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter(
        (command) => command.pattern && !command.dontAddCommandList,
      ).length;

      let expiryBannerMenus = "  ♾️  *𝘓𝘐𝘍𝘌𝘛𝘐𝘔𝘌 𝘓𝘐𝘊𝘌𝘕𝘚𝘌*\n  ✅  _𝘕𝘰 𝘦𝘹𝘱𝘪𝘳𝘺 𝘴𝘦𝘵 · 𝘈𝘭𝘸𝘢𝘺𝘴 𝘢𝘤𝘵𝘪𝘷𝘦_";
      try {
        const expiryDate = await getSetting("BOT_EXPIRY_DATE");
        if (expiryDate) {
          const exp = new Date(expiryDate);
          const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 0) {
            expiryBannerMenus = `  🔴  *𝘌𝘟𝘗𝘐𝘙𝘌𝘋*\n  ❌  _𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘦𝘯𝘥𝘦𝘥 · ${exp.toDateString()}_`;
          } else if (daysLeft <= 7) {
            expiryBannerMenus = `  🟡  *𝘌𝘟𝘗𝘐𝘙𝘠 𝘚𝘖𝘖𝘕* · _${daysLeft} day(s) left!_\n  ⚠️  _Expires: ${exp.toDateString()}_`;
          } else {
            expiryBannerMenus = `  🟢  *ACTIVE* · _${daysLeft} days remaining_\n  📅  _Expires: ${exp.toDateString()}_`;
          }
        }
      } catch {}

      const catIcons = {
        general: "🌐", owner: "👑", group: "👥", ai: "🤖",
        downloader: "📥", tools: "🔧", search: "🔍", games: "🎮",
        fun: "🎉", religion: "🕌", sticker: "🖼️", converter: "🔄",
        settings: "⚙️", media: "📸",
      };
      const categorized = commands.reduce((acc, cmd) => {
        if (cmd.pattern && !cmd.dontAddCommandList) {
          const cat = cmd.category || "general";
          if (!acc[cat]) acc[cat] = 0;
          acc[cat]++;
        }
        return acc;
      }, {});

      let categoryLines = Object.entries(categorized)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => {
          const icon = catIcons[cat.toLowerCase()] || "⚡";
          return `  ✦ ${icon} ${cat.charAt(0).toUpperCase() + cat.slice(1)}  ·  ${count} cmds`;
        })
        .join("\n");

      let menus =
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  ⚡ _The Ultimate WhatsApp Bot_ ⚡
  🤖 *${(botName || "ULTRA GURU MD").toUpperCase()}* 🤖
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  🔰 *GᴜʀᴜTᴇᴄʜ Lᴀʙ*  ·  _Official Build_
━━━━━━ 🔑 *LICENSE STATUS* ━━━━━━
${expiryBannerMenus}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📦 *Version* ›  v${botVersion || "5.0.0"}
  ⏱️ *Uptime*  ›  ${uptime}
  ⚡ *Prefix*  ›  ${monospace(botPrefix)}
  👤 *User*    ›  ${pushName}
  ⚙️ *Mode*    ›  ${botMode?.toUpperCase() || "PUBLIC"}
  📊 *Cmds*    ›  ${totalCommands} loaded
  🕒 *Time*    ›  ${time}
  📅 *Date*    ›  ${date}
  🌍 *Zone*    ›  ${timeZone}

▬▬▬▬▬▬ ❯ *COMMAND CATEGORIES* ❮ ▬▬▬▬▬

${categoryLines}

▬▬▬▬▬▬▬ ❯ *QUICK ACCESS* ❮ ▬▬▬▬▬▬▬▬

  ⚡ ${monospace(botPrefix + "menu")}   ›  Full command list
  📋 ${monospace(botPrefix + "list")}   ›  All commands
  🏓 ${monospace(botPrefix + "ping")}   ›  Bot response speed
  ⏱️ ${monospace(botPrefix + "uptime")} ›  Bot uptime
  🗂️ ${monospace(botPrefix + "repo")}   ›  Source code
  ❓ ${monospace(botPrefix + "help")}   ›  Usage guide

> ✨ _${botFooter}_`;

      const giftedMess = {
        image: { url: botPic },
        caption: menus.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      try {
        await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      } catch (_) {
        await Gifted.sendMessage(from, { text: menus.trim() }, { quoted: mek });
      }
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "list",
    aliases: ["listmenu", "listmen"],
    description: "Show All Commands and their Usage",
    react: "📜",
    category: "general",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      reply,
    } = conText;
    try {
      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const totalCommands = commands.filter(
        (command) => command.pattern && !command.dontAddCommandList,
      ).length;

      let expiryBannerList = "  ♾️  *𝘓𝘐𝘍𝘌𝘛𝘐𝘔𝘌 𝘓𝘐𝘊𝘌𝘕𝘚𝘌*\n  ✅  _𝘕𝘰 𝘦𝘹𝘱𝘪𝘳𝘺 𝘴𝘦𝘵 · 𝘈𝘭𝘸𝘢𝘺𝘴 𝘢𝘤𝘵𝘪𝘷𝘦_";
      try {
        const { getSetting: getSettingList } = require("../guru/database/settings");
        const expiryRawList = await getSettingList("BOT_EXPIRY_DATE");
        if (expiryRawList) {
          const expL = new Date(expiryRawList);
          const dL = Math.ceil((expL - now) / (1000 * 60 * 60 * 24));
          if (dL <= 0) expiryBannerList = `  🔴  *𝘌𝘟𝘗𝘐𝘙𝘌𝘋*\n  ❌  _𝘓𝘪𝘤𝘦𝘯𝘴𝘦 𝘦𝘯𝘥𝘦𝘥 · ${expL.toDateString()}_`;
          else if (dL <= 7) expiryBannerList = `  🟡  *𝘌𝘟𝘗𝘐𝘙𝘠 𝘚𝘖𝘖𝘕* · _${dL} day(s) left!_\n  ⚠️  _Expires: ${expL.toDateString()}_`;
          else expiryBannerList = `  🟢  *ACTIVE* · _${dL} days remaining_\n  📅  _Expires: ${expL.toDateString()}_`;
        }
      } catch {}

      let list =
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  ⚡ _The Ultimate WhatsApp Bot_ ⚡
  🤖 *${(botName || "ULTRA GURU MD").toUpperCase()}* 🤖
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  🔰 *GᴜʀᴜTᴇᴄʜ Lᴀʙ*  ·  _Official Build_
━━━━━━ 🔑 *LICENSE STATUS* ━━━━━━
${expiryBannerList}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         📋 _Full Command Index_

  ✦ 📦 *Version* ›  ${monospace("v" + (botVersion || "5.0.0"))}
  ✦ ⏱️ *Uptime*  ›  ${monospace(uptime)}
  ✦ ⚡ *Prefix*  ›  ${monospace(botPrefix)}
  ✦ 👤 *User*    ›  ${monospace(pushName)}
  ✦ ⚙️ *Mode*    ›  ${monospace((botMode || "public").toUpperCase())}
  ✦ 📊 *Cmds*    ›  ${monospace(totalCommands.toString())} loaded
  ✦ 🕒 *Time*    ›  ${monospace(time)}
  ✦ 📅 *Date*    ›  ${monospace(date)}
  ✦ 🌍 *Zone*    ›  ${monospace(timeZone)}
  ✦ 💾 *RAM*     ›  ${monospace(ram)}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬${readmore}\n\n`;

      const sortedCmds = commands
        .filter((gmd) => gmd.pattern && gmd.description)
        .sort((a, b) => b.pattern.length - a.pattern.length);
      sortedCmds.forEach((gmd, index) => {
        list += `*${index + 1}.* ${monospace(gmd.pattern)}\n   ↳ ${gmd.description}\n\n`;
      });

      const giftedMess = {
        image: { url: botPic },
        caption: list.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      try {
        await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      } catch (_) {
        await Gifted.sendMessage(from, { text: list.trim() }, { quoted: mek });
      }
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

const CAT_ICONS = {
  general: "🌐", owner: "👑", group: "👥", ai: "🤖",
  downloader: "📥", tools: "🔧", search: "🔍", games: "🎮",
  fun: "🎉", religion: "🕌", sticker: "🖼️", converter: "🔄",
  settings: "⚙️", media: "📸", notes: "📝", channels: "📢",
  sports: "⚽", extras: "✨", texttools: "🔡", restrictions: "🚫",
};

const CAT_ORDER = ["general","ai","downloader","tools","search","games","group","owner","settings","fun","converter","religion","texttools","notes","channels","sports","extras","restrictions","sticker","media"];

function buildCategorizedMenu(commands) {
  const categorized = {};
  for (const cmd of commands) {
    if (!cmd.pattern || cmd.dontAddCommandList) continue;
    const cat = (cmd.category || "general").toLowerCase();
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push({
      pattern: cmd.pattern,
      description: cmd.description || "",
      isBody: cmd.on === "body",
    });
  }
  for (const cat of Object.keys(categorized)) {
    categorized[cat].sort((a, b) => a.pattern.localeCompare(b.pattern));
  }
  return categorized;
}

function getSortedCats(categorized) {
  return Object.keys(categorized).sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

gmd(
  {
    pattern: "menu",
    aliases: ["help", "men", "allmenu"],
    react: "📜",
    category: "general",
    description: "Browse commands by category — reply with a number",
  },
  async (from, Gifted, conText) => {
    const {
      mek, sender, react, botPic, botName, botFooter, newsletterJid, reply,
    } = conText;
    try {
      // ── themed menu (design.js) ──────────────────────────────────────────
      const { buildThemedMenu } = require("./design");
      const { getSetting: _gs } = require("../guru/database/settings");
      const menuText = await buildThemedMenu(conText, Gifted);
      const picUrl   = (await _gs("BOT_PIC")) || botPic;

      const giftedMess = {
        image: { url: picUrl },
        caption: menuText.trim(),
        contextInfo: {
          mentionedJid: [sender],
          forwardingScore: 5,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: newsletterJid,
            newsletterName: botName,
            serverMessageId: 0,
          },
        },
      };
      try {
        await Gifted.sendMessage(from, giftedMess, { quoted: mek });
      } catch (_) {
        await Gifted.sendMessage(from, { text: menuText.trim() }, { quoted: mek });
      }
      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    on: "body",
    pattern: /^\d{1,2}$/,
    dontAddCommandList: true,
    category: "general",
  },
  async (from, Gifted, conText) => {
    const {
      mek, sender, react, pushName, botPic, botMode, botVersion,
      botName, botFooter, botPrefix, newsletterJid, reply, body,
    } = conText;
    try {
      const rawBody = (body || "").trim();
      if (!/^\d{1,2}$/.test(rawBody)) return;
      const num = parseInt(rawBody, 10);
      if (isNaN(num) || num < 0) return;

      const categorized = buildCategorizedMenu(commands);
      // Use the SAME sort function that design.js uses to number the menu lines
      // so "reply with 3" always maps to exactly the 3rd category the user sees
      const { getMenuCategoryOrder } = require("./design");
      const sortedCats = getMenuCategoryOrder(commands)
        .map(cat => cat.toLowerCase())
        .filter(cat => categorized[cat]);

      // 0 = go back to main menu
      if (num === 0) {
        function formatUptime(s) {
          const d = Math.floor(s / 86400); s %= 86400;
          const h = Math.floor(s / 3600); s %= 3600;
          const m = Math.floor(s / 60);
          return `${d}d ${h}h ${m}m`;
        }
        const uptime = formatUptime(Math.floor(process.uptime()));
        const totalCmds = commands.filter(c => c.pattern && !c.dontAddCommandList).length;

        const { getSetting: getSettingMenu } = require("../guru/database/settings");
        let expiryLine = "♾️  LIFETIME LICENSE";
        let expiryDetail = "No expiry set · Always active";
        try {
          const now = new Date();
          const expiryRaw = await getSettingMenu("BOT_EXPIRY_DATE");
          if (expiryRaw) {
            const exp = new Date(expiryRaw);
            const dLeft = Math.ceil((exp - now) / 86400000);
            const hLeft = Math.floor(((exp - now) % 86400000) / 3600000);
            const mLeft = Math.floor(((exp - now) % 3600000) / 60000);
            if (dLeft <= 0) {
              expiryLine = "🔴  EXPIRED";
              expiryDetail = `License ended · ${exp.toDateString()}`;
            } else if (dLeft <= 7) {
              expiryLine = "🟡  EXPIRY SOON";
              expiryDetail = `${dLeft}d ${hLeft}h ${mLeft}m left`;
            } else {
              expiryLine = "🟢  ACTIVE LICENSE";
              expiryDetail = `${exp.toLocaleDateString("en-GB")}, (${dLeft}d ${hLeft}h ${mLeft}m left)`;
            }
          }
        } catch {}

        const catLines = sortedCats.map((cat, i) => {
          const icon = CAT_ICONS[cat] || "⚡";
          const count = categorized[cat].length;
          const label = (cat.charAt(0).toUpperCase() + cat.slice(1)).toUpperCase();
          return `> │◦➛ ${i + 1}. ${icon} ${si(label)}  _(${count} 𝘤𝘮𝘥𝘴)_`;
        }).join("\n");

        // ── themed menu (design.js) ────────────────────────────────────────
        const { buildThemedMenu } = require("./design");
        const { getSetting: _gs0 } = require("../guru/database/settings");
        const menuText = await buildThemedMenu(conText, Gifted);
        const picUrl0  = (await _gs0("BOT_PIC")) || botPic;

        const giftedMess = {
          image: { url: picUrl0 },
          caption: menuText.trim(),
          contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        };
        try {
          await Gifted.sendMessage(from, giftedMess, { quoted: mek });
        } catch (_) {
          await Gifted.sendMessage(from, { text: menuText.trim() }, { quoted: mek });
        }
        return await react("✅");
      }

      // 1–N = show category card
      if (num > sortedCats.length) return;

      const cat = sortedCats[num - 1];
      const cmds = categorized[cat];
      const icon = CAT_ICONS[cat] || "⚡";
      const label = (cat.charAt(0).toUpperCase() + cat.slice(1)).toUpperCase();

      const PAGE_SIZE = 30;
      const chunks = [];
      for (let i = 0; i < cmds.length; i += PAGE_SIZE) {
        chunks.push(cmds.slice(i, i + PAGE_SIZE));
      }
      const totalPages = chunks.length;

      for (let p = 0; p < chunks.length; p++) {
        const chunk = chunks[p];
        const cmdLines = chunk.map(cmd => {
          const prefix = cmd.isBody ? "" : botPrefix;
          const pat = (prefix + cmd.pattern).padEnd(18, " ");
          const desc = cmd.description
            ? (cmd.description.length > 28 ? cmd.description.slice(0, 26) + "…" : cmd.description)
            : "—";
          return `> │◈ *${pat}* › _${desc}_`;
        }).join("\n> │\n");

        const pageLabel = totalPages > 1 ? ` — Page ${p + 1}/${totalPages}` : "";
        const footer = p === totalPages - 1
          ? `  💬 _𝘙𝘦𝘱𝘭𝘺_ *0* _𝘵𝘰 𝘨𝘰 𝘣𝘢𝘤𝘬 𝘵𝘰 𝘮𝘦𝘯𝘶_\n> ✨ _${botFooter}_`
          : `  ➡️ _Continued in next message..._`;

        const card =
`╭───〔 *${icon} ${label} 𝘊𝘖𝘔𝘔𝘈𝘕𝘋𝘚${pageLabel}* 〕──────┈⊷𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭𑲭
├──────────────────────
│✵│▸ 📊 *𝘛𝘖𝘛𝘈𝘓:* ${cmds.length} 𝘤𝘰𝘮𝘮𝘢𝘯𝘥𝘴  │  *𝘚𝘩𝘰𝘸𝘪𝘯𝘨:* ${p * PAGE_SIZE + 1}–${Math.min((p + 1) * PAGE_SIZE, cmds.length)}
│✵│▸ ⚡ *𝘗𝘙𝘌𝘍𝘐𝘟:* ${botPrefix}
├──────────────────────
│
${cmdLines}
│
╰─────────────────────┈⊷
${footer}`;

        await Gifted.sendMessage(from, { text: card.trim() }, { quoted: mek });
        if (p < chunks.length - 1) await new Promise(r => setTimeout(r, 800));
      }

      await react("✅");
    } catch (e) {
      console.error(e);
    }
  },
);

gmd(
  {
    pattern: "return",
    aliases: ["details", "det", "ret"],
    react: "⚡",
    category: "owner",
    description:
      "Displays the full raw quoted message using Baileys structure.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      reply,
      react,
      quotedMsg,
      isSuperUser,
      botName,
      botFooter,
      newsletterJid,
      newsletterUrl,
    } = conText;

    if (!isSuperUser) {
      return reply(`Owner Only Command!`);
    }

    if (!quotedMsg) {
      return reply(`Please reply to/quote a message`);
    }

    try {
      const jsonString = JSON.stringify(quotedMsg, null, 2);
      const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

      for (const chunk of chunks) {
        const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

        await sendButtons(Gifted, from, {
          title: "",
          text: formattedMessage,
          footer: `> *${botFooter}*`,
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy",
                copy_code: formattedMessage,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "WaChannel",
                url: newsletterUrl,
              }),
            },
          ],
        });

        await react("✅");
      }
    } catch (error) {
      console.error("Error processing quoted message:", error);
      await reply(`❌ An error occurred while processing the message.`);
    }
  },
);

gmd(
  {
    pattern: "uptime",
    aliases: ["up"],
    react: "⏳",
    category: "general",
    description: "check bot uptime status.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      react,
      newsletterJid,
      newsletterUrl,
      botFooter,
      botName,
      botPrefix,
    } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;

    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await sendButtons(Gifted, from, {
      title: "",
      text:
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  ⏱️ *${(botName || "ULTRA GURU MD").toUpperCase()}* ⏱️
      _𝘜𝘱𝘵𝘪𝘮𝘦 & 𝘚𝘵𝘢𝘵𝘶𝘴 𝘊𝘩𝘦𝘤𝘬_
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂

  ⏳ *Runtime* ›  ${monospace(`${days}d ${hours}h ${minutes}m ${seconds}s`)}
  🟢 *𝘚𝘵𝘢𝘵𝘶𝘴*  ›  Running Smoothly
  💡 *𝘚𝘦𝘴𝘴𝘪𝘰𝘯* ›  𝘈𝘤𝘵𝘪𝘷𝘦 & 𝘚𝘵𝘢𝘣𝘭𝘦`,
      footer: `> ✨ _${botFooter}_`,
      buttons: [
        { id: `${botPrefix}ping`, text: "⚡ Ping" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "WaChannel",
            url: newsletterUrl,
          }),
        },
      ],
    });
    await react("✅");
  },
);

gmd(
  {
    pattern: "help",
    aliases: ["h", "guide", "start"],
    react: "📖",
    category: "general",
    description: "Usage guide and quick help for the bot.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      react,
      sender,
      pushName,
      botPic,
      botName,
      botFooter,
      botPrefix,
      botVersion,
      newsletterUrl,
      newsletterJid,
    } = conText;

    const helpText =
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  📖 *${(botName || "ULTRA GURU MD").toUpperCase()}* 📖
        _Quick Usage Guide_
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  🔰 *GᴜʀᴜTᴇᴄʜ Lᴀʙ*  ·  _Official Build_
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

👋 Welcome *${pushName}!*
_Here's everything you need to get started._

▬▬▬▬▬ ❯ *HOW TO USE* ❮ ▬▬▬▬▬▬

  ⚡ *Prefix*  ›  ${monospace(botPrefix)}
  📌 *Format*  ›  ${monospace(botPrefix + "command")}
  📦 *Version* ›  v${botVersion || "5.0.0"}

▬▬▬▬ ❯ *KEY 𝘊𝘖𝘔𝘔𝘈𝘕𝘋𝘚* ❮ ▬▬▬▬▬▬

  ${monospace(botPrefix + "menu")}    ›  Full categorized menu
  ${monospace(botPrefix + "list")}    ›  All commands + descriptions
  ${monospace(botPrefix + "ping")}    ›  Check bot response speed
  ${monospace(botPrefix + "uptime")}  ›  How long bot has been online
  ${monospace(botPrefix + "repo")}    ›  Get the source code
  ${monospace(botPrefix + "ai")}      ›  Talk to the AI assistant
  ${monospace(botPrefix + "sticker")} ›  Create stickers from media
  ${monospace(botPrefix + "tiktok")}  ›  Download TikTok videos
  ${monospace(botPrefix + "spotify")} ›  Download Spotify tracks

▬▬▬▬ ❯ *TIPS & NOTES* ❮ ▬▬▬▬▬▬

  ✦ Reply to media with a command
  ✦ All commands need the prefix: ${monospace(botPrefix)}
  ✦ Use ${monospace(botPrefix + "list")} to see every command
  ✦ Owner commands need permission

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
> ✨ _${botFooter}_`;

    const giftedMess = {
      image: { url: botPic },
      caption: helpText,
      contextInfo: {
        mentionedJid: [sender],
        forwardingScore: 5,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterJid,
          newsletterName: botName,
          serverMessageId: 200,
        },
      },
    };

    try {
      await Gifted.sendMessage(from, giftedMess, { quoted: mek });
    } catch (_) {
      await Gifted.sendMessage(from, { text: helpText }, { quoted: mek });
    }
    await react("✅");
  },
);

gmd(
  {
    pattern: "repo",
    aliases: ["sc", "rep", "script"],
    react: "💜",
    category: "general",
    description: "Fetch bot script.",
  },
  async (from, Gifted, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      ownerName,
      newsletterJid,
      giftedRepo,
    } = conText;

    const response = await axios.get(
      `https://api.github.com/repos/${giftedRepo}`,
    );
    const repoData = response.data;
    const {
      full_name,
      name,
      forks_count,
      stargazers_count,
      created_at,
      updated_at,
      owner,
    } = repoData;
    const messageText =
`꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  🗂️ *${(botName || "ULTRA GURU MD").toUpperCase()} REPO* 🗂️
     ⚡ _Open Source · Free Forever_ ⚡
꧁✦━━━━━━━━━━━━━━━━━━━━━━━━━✦꧂
  🔰 *GᴜʀᴜTᴇᴄʜ Lᴀʙ*  ·  _Official Build_
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

👋 Hey *${pushName}!*
_${botName || "ULTRA GURU MD"} is a powerful multi-device WhatsApp bot built by *${ownerName}*, packed with amazing features to enhance your experience._

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
  📦 *Name*     ›  ${monospace(name)}
  ⭐ *Stars*    ›  ${monospace(String(stargazers_count))}
  🍴 *Forks*    ›  ${monospace(String(forks_count))}
  🗓️ *Created*  ›  ${monospace(new Date(created_at).toLocaleDateString())}
  🔄 *Updated*  ›  ${monospace(new Date(updated_at).toLocaleDateString())}
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬

> ✨ _${botFooter}_`;

    const dateNow = Date.now();
    await sendButtons(Gifted, from, {
      title: "",
      text: messageText,
      footer: `> *${botFooter}*`,
      image: { url: botPic },
      buttons: [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "Copy Link",
            copy_code: `https://github.com/${giftedRepo}`,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Visit Repo",
            url: `https://github.com/${giftedRepo}`,
          }),
        },
        {
          id: `repo_dl_${dateNow}`,
          text: "📥 Download Zip",
        },
      ],
    });

    const handleResponse = async (event) => {
      const messageData = event.messages[0];
      if (!messageData?.message) return;

      const templateButtonReply =
        messageData.message?.templateButtonReplyMessage;
      if (!templateButtonReply) return;

      const selectedButtonId = templateButtonReply.selectedId;
      if (!selectedButtonId?.includes(`repo_dl_${dateNow}`)) return;

      const isFromSameChat = messageData.key?.remoteJid === from;
      if (!isFromSameChat) return;

      try {
        const zipUrl = `https://github.com/${giftedRepo}/archive/refs/heads/main.zip`;
        await Gifted.sendMessage(
          from,
          {
            document: { url: zipUrl },
            fileName: `${name}.zip`,
            mimetype: "application/zip",
          },
          { quoted: messageData },
        );
        await react("✅");
      } catch (dlErr) {
        await Gifted.sendMessage(from, { text: "Failed to download repo zip: " + dlErr.message }, { quoted: messageData });
      }

      Gifted.ev.off("messages.upsert", handleResponse);
    };

    Gifted.ev.on("messages.upsert", handleResponse);
    setTimeout(
      () => Gifted.ev.off("messages.upsert", handleResponse),
      120000,
    );

    await react("✅");
  },
);

gmd(
  {
    pattern: "save",
    aliases: ["sv", "s", "sav", "."],
    react: "⚡",
    category: "owner",
    description:
      "Save messages (supports images, videos, audio, stickers, and text).",
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, sender, isSuperUser, getMediaBuffer } = conText;

    if (!isSuperUser) {
      return reply(`❌ Owner Only Command!`);
    }

    const quotedMsg =
      mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMsg) {
      return reply(`⚠️ Please reply to/quote a message.`);
    }

    try {
      let mediaData;

      if (quotedMsg.imageMessage) {
        const buffer = await getMediaBuffer(quotedMsg.imageMessage, "image");
        mediaData = {
          image: buffer,
          caption: quotedMsg.imageMessage.caption || "",
        };
      } else if (quotedMsg.videoMessage) {
        const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
        mediaData = {
          video: buffer,
          caption: quotedMsg.videoMessage.caption || "",
        };
      } else if (quotedMsg.audioMessage) {
        const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
        mediaData = {
          audio: buffer,
          mimetype: "audio/mp4",
        };
      } else if (quotedMsg.stickerMessage) {
        const buffer = await getMediaBuffer(
          quotedMsg.stickerMessage,
          "sticker",
        );
        mediaData = {
          sticker: buffer,
        };
      } else if (quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage?.message?.documentMessage) {
        const docMsg = quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage.message.documentMessage;
        const buffer = await getMediaBuffer(docMsg, "document");
        mediaData = {
          document: buffer,
          fileName: docMsg.fileName || "document",
          mimetype: docMsg.mimetype || "application/octet-stream",
        };
      } else if (
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text
      ) {
        const text =
          quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
        mediaData = {
          text: text,
        };
      } else if (quotedMsg.buttonsMessage || quotedMsg.templateMessage || quotedMsg.interactiveMessage || quotedMsg.listMessage || quotedMsg.buttonsResponseMessage || quotedMsg.templateButtonReplyMessage) {
        let text = "";
        if (quotedMsg.buttonsMessage) {
          text = quotedMsg.buttonsMessage.contentText || quotedMsg.buttonsMessage.text || "";
        } else if (quotedMsg.templateMessage?.hydratedTemplate) {
          text = quotedMsg.templateMessage.hydratedTemplate.hydratedContentText || "";
        } else if (quotedMsg.interactiveMessage?.body?.text) {
          text = quotedMsg.interactiveMessage.body.text;
        } else if (quotedMsg.listMessage) {
          text = quotedMsg.listMessage.description || quotedMsg.listMessage.title || "";
        } else if (quotedMsg.buttonsResponseMessage) {
          text = quotedMsg.buttonsResponseMessage.selectedDisplayText || "";
        } else if (quotedMsg.templateButtonReplyMessage) {
          text = quotedMsg.templateButtonReplyMessage.selectedDisplayText || "";
        }
        if (!text) {
          return reply(`❌ Could not extract text from the quoted message.`);
        }
        mediaData = {
          text: text,
        };
      } else {
        return reply(`❌ Unsupported message type.`);
      }

      await Gifted.sendMessage(sender, mediaData, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Save Error:", error);
      await reply(`❌ Failed to save the message. Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "chjid",
    aliases: [
      "channeljid",
      "chinfo",
      "channelinfo",
      "newsletterjid",
      "newsjid",
      "newsletterinfo",
    ],
    react: "📢",
    category: "general",
    description: "Get WhatsApp Channel/Newsletter Info",
  },
  async (from, Gifted, conText) => {
    const { q, reply, react, botFooter, botPrefix, GiftedTechApi, GiftedApiKey } = conText;

    const input = q?.trim();
    if (!input) {
      await react("❌");
      return reply(
        `❌ Provide a channel link.\nUsage: *${botPrefix}chjid* https://whatsapp.com/channel/KEY`,
      );
    }

    const channelMatch = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    if (!channelMatch) {
      await react("❌");
      return reply(
        "❌ Invalid channel link. Provide a valid WhatsApp channel link.\nExample: https://whatsapp.com/channel/ABC123",
      );
    }

    await react("🔍");
    const inviteKey = channelMatch[1];
    const channelUrl = `https://whatsapp.com/channel/${inviteKey}`;

    try {
      const meta = await Gifted.newsletterMetadata("invite", inviteKey);

      if (!meta || !meta.id) {
        await react("❌");
        return reply(
          "❌ Could not fetch channel info. The link may be invalid or the channel no longer exists.",
        );
      }

      const channelJid = meta.id;
      const tm = meta.thread_metadata || {};

      const name = tm.name?.text || "Unknown Channel";
      const rawDesc = tm.description?.text || "";
      const verification = tm.verification || "";
      const isVerified = verification === "VERIFIED";
      const stateType = meta.state?.type || "";
      const isActive = stateType === "ACTIVE";

      const subCount = parseInt(tm.subscribers_count || "0", 10);
      const followers =
        subCount >= 1_000_000
          ? `${(subCount / 1_000_000).toFixed(1)}M`
          : subCount >= 1_000
            ? `${(subCount / 1_000).toFixed(1)}K`
            : subCount > 0
              ? subCount.toLocaleString()
              : "N/A";

      let picUrl = null;
      try {
        const apiUrl = `\( {GiftedTechApi}/api/stalk/wachannel?apikey= \){GiftedApiKey}&url=${encodeURIComponent(channelUrl)}`;
        const apiRes = await axios.get(apiUrl, { timeout: 10000 });
        picUrl = apiRes.data?.result?.img || null;
      } catch (apiErr) {
        console.error("chjid pic error:", apiErr.message);
      }

      const MAX_DESC = 200;
      let descSection = "";
      if (rawDesc) {
        const trimmed = rawDesc.trim();
        if (trimmed.length > MAX_DESC) {
          const visible = trimmed.slice(0, MAX_DESC);
          const hidden = trimmed.slice(MAX_DESC);
          descSection = `\n\n📄 *Description:*\n${visible}${readmore}${hidden}`;
        } else {
          descSection = `\n\n📄 *Description:*\n${trimmed}`;
        }
      }

      const text =
        `📢 *Channel Info*\n\n` +
        `🔖 *Name:* ${name}\n` +
        `🟢 *Status:* ${isActive ? "Active" : stateType || "Unknown"}\n` +
        `${isVerified ? "✅ *Verified:* Yes\n" : "❌ *Verified:* No\n"}` +
        `👥 *Followers:* ${followers}\n` +
        `🆔 *JID:* \`${channelJid}\`` +
        descSection;

      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy JID",
            copy_code: channelJid,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "➕ Follow Channel",
            url: channelUrl,
            merchant_url: channelUrl,
          }),
        },
      ];

      const sendOpts = {
        text,
        footer: botFooter,
        buttons,
      };

      if (picUrl) {
        sendOpts.image = { url: picUrl };
      }

      await sendButtons(Gifted, from, sendOpts);
      await react("✅");
    } catch (error) {
      console.error("chjid error:", error);
      await react("❌");
      await reply(`❌ Error fetching channel info: ${error.message}`);
    }
  },
);
