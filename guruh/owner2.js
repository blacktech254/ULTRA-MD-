
const { gmd, commands, getSetting } = require("../guru");
const fs = require("fs").promises;
const fsA = require("node:fs");
const { S_WHATSAPP_NET } = require("@whiskeysockets/baileys");
const { Jimp } = require("jimp");
const path = require("path");
const moment = require("moment-timezone");
const {
  groupCache,
  getGroupMetadata,
  cachedGroupMetadata,
} = require("../guru/connection/groupCache");

const { exec: _shellExec } = require("child_process");

gmd(
  {
    pattern: "$",
    on: "body",
    react: "🖥️",
    category: "owner",
    dontAddCommandList: true,
    description: "Run a shell command. Usage: $ <command>",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, body } = conText;
    if (!body.startsWith("$")) return;
    if (!isSuperUser) return;

    const shellCmd = body.slice(1).trim();
    if (!shellCmd) return reply("Usage: $ <command>");

    await react("⏳");
    _shellExec(shellCmd, { timeout: 30000, maxBuffer: 1024 * 1024 * 5 }, async (err, stdout, stderr) => {
      const output = (stdout || "") + (stderr ? `\n[stderr]\n${stderr}` : "");
      const result = err && !output.trim()
        ? `❌ Error: ${err.message}`
        : output.trim() || "(no output)";
      await react("✅");
      await reply("```\n" + result.slice(0, 4000) + "\n```");
    });
  }
);

gmd(
  {
    pattern: ">",
    on: "body",
    react: "⚡",
    category: "owner",
    dontAddCommandList: true,
    description: "Evaluate a JavaScript expression. Usage: > <code>",
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, isSuperUser, body } = conText;
    if (!body.startsWith(">")) return;
    if (!isSuperUser) return reply("❌ Owner only");

    const code = body.slice(1).trim();
    if (!code) return reply("Usage: > <js expression>");

    await react("⏳");
    try {
      const gift = require("../guru");
      const _rawDb = require("../guru/database/database").DATABASE;
      const settings = await gift.getAllSettings();
      const { getSetting, setSetting, getAllSettings, commands } = gift;
      const prefix = settings.PREFIX;
      const botPrefix = settings.PREFIX;
      const db = new Proxy({ raw: _rawDb }, {
        get(target, key) {
          if (key === 'raw') return _rawDb;
          if (key === 'toJSON') return () => settings;
          if (key === 'toString') return () => JSON.stringify(settings, null, 2);
          const upper = String(key).toUpperCase();
          if (upper in settings) return settings[upper];
          return target[key];
        }
      });
      const bot = Gifted;
      const m = mek;
      const {
        sender, isGroup, groupInfo, groupName, participants,
        isSuperAdmin, isAdmin, isBotAdmin, superUser,
        botName, ownerNumber, ownerName,
        q, args, quotedMsg, quotedUser, quotedKey,
        pushName, tagged, mentionedJid, repliedMessage,
        botFooter, botCaption, botVersion, botPic,
        timeZone, newsletterJid, newsletterUrl,
        groupAdmins, isSuperUser, authorMessage,
      } = conText;

      let result;
      try {
        result = await eval(`(async () => { return (${code}) })()`);
      } catch (e1) {
        result = await eval(`(async () => { ${code} })()`);
      }
      if (result === undefined) result = "(undefined)";
      let output;
      if (typeof result === "object" && result !== null) {
        try {
          output = JSON.stringify(result, null, 2);
        } catch (_) {
          output = String(result);
        }
      } else {
        output = String(result);
      }
      await react("✅");
      await reply("```\n" + output.slice(0, 4000) + "\n```");
    } catch (err) {
      await react("❌");
      await reply(`❌ Error: ${err.message}`);
    }
  }
);

gmd(
  {
    pattern: "pushgit",
    aliases: ["gitpush", "gitsync"],
    react: "🚀",
    category: "owner",
    description: "Stage, commit and push all bot changes to GitHub. Usage: .pushgit [commit message]",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, args } = conText;
    if (!isSuperUser) return reply("❌ Owner only.");

    const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (!token) {
      await react("❌");
      return reply(
        "❌ *GITHUB_PERSONAL_ACCESS_TOKEN* is not set.\n\n" +
        "Add it as a Replit Secret and restart the bot."
      );
    }

    const commitMsg = args.join(" ").trim() || `bot: auto-push ${new Date().toISOString()}`;
    const remoteUrl = `https://x-access-token:${token}@github.com/blacktech254/ULTRA-MD-`;

    await react("⏳");
    await reply("⏳ Staging and pushing to GitHub...");

    _shellExec(
      `git add -A && git diff --cached --quiet || git -c user.email="bot@ultraguru.md" -c user.name="Ultra Guru MD" commit -m "${commitMsg.replace(/"/g, "'")}" && git push "${remoteUrl}" main 2>&1`,
      { timeout: 60000, maxBuffer: 1024 * 1024 * 2 },
      async (err, stdout, stderr) => {
        const output = (stdout || "").trim();

        if (err && !output) {
          await react("❌");
          return reply(`❌ Push failed:\n\`\`\`\n${(stderr || err.message).slice(0, 1500)}\n\`\`\``);
        }

        // Grab the latest commit hash to confirm
        _shellExec("git log --oneline -3", {}, async (_, log) => {
          await react("✅");
          await reply(
            `✅ *Successfully pushed to GitHub!*\n\n` +
            `📝 Commit: _${commitMsg}_\n\n` +
            `📌 *Latest commits:*\n\`\`\`\n${(log || "").trim()}\n\`\`\`\n\n` +
            `🔗 https://github.com/blacktech254/ULTRA-MD-`
          );
        });
      }
    );
  }
);
