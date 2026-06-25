#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
//  GITHUB SYNC SCRIPT  ·  ULTRA GURU MD
//  Uses GitHub REST API (plain HTTPS) — no git commands required.
//  Run: node scripts/github-sync.js
//  Or:  node scripts/github-sync.js --all  (sync every tracked file)
// ═══════════════════════════════════════════════════════════════════

const fs   = require("fs");
const path = require("path");

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const REPO  = "blacktech254/ULTRA-MD-";
const BASE  = `https://api.github.com/repos/${REPO}/contents/`;
const ROOT  = path.join(__dirname, "..");

if (!TOKEN) {
    console.error("❌  GITHUB_PERSONAL_ACCESS_TOKEN is not set.");
    process.exit(1);
}

// ── Files to sync (relative to project root) ─────────────────────
const PRIORITY_FILES = [
    // Core bot
    "index.js",
    // Modified/new plugins
    "guruh/autoreply.js",
    "guruh/polls.js",
    "guruh/economy.js",
    "guruh/reminders.js",
    "guruh/smartsettings.js",
    "guruh/savemedia.js",
    "guruh/greetings.js",
    // Core modified modules
    "guru/scheduler.js",
    "guru/connection/connectionHandler.js",
    // Scripts
    "scripts/github-sync.js",
];

// Walk all .js files in guruh/ for --all mode
function walkJs(dir, base = dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const rel  = path.relative(base, full).replace(/\\/g, "/");
        if (fs.statSync(full).isDirectory()) {
            files.push(...walkJs(full, base));
        } else if (entry.endsWith(".js")) {
            files.push(rel);
        }
    }
    return files;
}

const ALL_MODE = process.argv.includes("--all");

const FILES = ALL_MODE
    ? [
        "index.js",
        ...walkJs(path.join(ROOT, "guruh"), ROOT),
        "guru/scheduler.js",
        "guru/connection/connectionHandler.js",
    ]
    : PRIORITY_FILES;

// ── GitHub API helper ─────────────────────────────────────────────
const ghHeaders = {
    Authorization: `Bearer ${TOKEN}`,
    Accept:        "application/vnd.github.v3+json",
    "Content-Type": "application/json",
    "User-Agent":  "ULTRA-GURU-MD-Sync",
};

async function getRemoteSha(filePath) {
    try {
        const res = await fetch(BASE + filePath, { headers: ghHeaders });
        if (res.status === 200) {
            const json = await res.json();
            return json.sha || null;
        }
    } catch (_) {}
    return null;
}

async function pushFile(filePath) {
    const absPath = path.join(ROOT, filePath);
    if (!fs.existsSync(absPath)) {
        console.log(`⚠️  Skip (not found): ${filePath}`);
        return "skip";
    }

    const content = fs.readFileSync(absPath);
    const encoded = content.toString("base64");

    const sha  = await getRemoteSha(filePath);
    const body = {
        message: `chore: sync ${filePath} [ULTRA GURU MD auto-push]`,
        content: encoded,
        branch:  "main",
        ...(sha ? { sha } : {}),
    };

    const res = await fetch(BASE + filePath, {
        method:  "PUT",
        headers: ghHeaders,
        body:    JSON.stringify(body),
    });

    if (res.ok) {
        const action = sha ? "Updated" : "Created";
        console.log(`✅  ${action}: ${filePath}`);
        return "ok";
    }

    const err = await res.text();
    // "no change" from GitHub means file is identical — not an error
    if (err.includes("same") || res.status === 422) {
        console.log(`⏭️  No change: ${filePath}`);
        return "skip";
    }

    console.error(`❌  Failed (${res.status}): ${filePath} — ${err.slice(0, 80)}`);
    return "fail";
}

// ── Main ──────────────────────────────────────────────────────────
(async () => {
    console.log(`\n🚀  GitHub Sync — ${ALL_MODE ? "ALL files" : "priority files"}`);
    console.log(`📂  Repo: ${REPO}`);
    console.log(`📄  Files: ${FILES.length}\n`);

    let ok = 0, skipped = 0, failed = 0;

    for (const f of FILES) {
        const result = await pushFile(f);
        if (result === "ok")   ok++;
        if (result === "skip") skipped++;
        if (result === "fail") failed++;
        // Small delay to respect GitHub API rate limits
        await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n${"─".repeat(40)}`);
    console.log(`📊  Results: ✅ ${ok} pushed | ⏭️ ${skipped} unchanged | ❌ ${failed} failed`);
    if (failed > 0) process.exit(1);
})();
