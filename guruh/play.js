"use strict";

const { gmd } = require("../guru");
const yts     = require("yt-search");
const axios   = require("axios");

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isYtUrl(str) {
    return /youtu\.?be/.test(str);
}

function isValidBuffer(buf) {
    return Buffer.isBuffer(buf) && buf.length > 10240;
}

// Expanded audio download API list — tried in order until one works
function audioApis(url) {
    const enc = encodeURIComponent(url);
    return [
        `https://apiskeith.top/download/audio?url=${enc}`,
        `https://api.giftedtech.web.id/api/download/ytmp3?apikey=free&url=${enc}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${enc}`,
        `https://api.vreden.my.id/api/ytmp3?url=${enc}`,
        `https://api.betabotz.eu.org/api/download/ytmp3?url=${enc}`,
        `https://api.siputzx.my.id/api/d/ytmp3?url=${enc}`,
        `https://wadownloader.amitdas.site/api/yt?url=${enc}`,
        `https://api-xeon.tech/api/download/ytmp3?url=${enc}`,
        `https://silva-md-bot.onrender.com/api/download?url=${enc}`,
        `https://api.tiklydown.eu.org/api/download/ytmp3?url=${enc}`,
    ];
}

// Expanded video download API list
function videoApis(url) {
    const enc = encodeURIComponent(url);
    return [
        `https://apiskeith.top/download/video?url=${enc}`,
        `https://api.giftedtech.web.id/api/download/ytmp4?apikey=free&url=${enc}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${enc}`,
        `https://api.vreden.my.id/api/ytmp4?url=${enc}`,
        `https://api.betabotz.eu.org/api/download/ytmp4?url=${enc}`,
        `https://api.siputzx.my.id/api/d/ytmp4?url=${enc}`,
        `https://wadownloader.amitdas.site/api/yt?url=${enc}&type=video`,
        `https://api-xeon.tech/api/download/ytmp4?url=${enc}`,
        `https://silva-md-bot.onrender.com/api/download?url=${enc}&type=video`,
        `https://api.tiklydown.eu.org/api/download/ytmp4?url=${enc}`,
    ];
}

// Try every endpoint until one returns a usable download URL
async function resolveDownloadUrl(endpoints, timeoutMs = 40000) {
    for (const endpoint of endpoints) {
        try {
            console.log(`🔄 Trying: ${endpoint}`);
            const { data } = await axios.get(endpoint, { timeout: timeoutMs });

            const url =
                data?.result        ||
                data?.download_url  ||
                data?.result?.download_url ||
                data?.result?.url   ||
                data?.url           ||
                data?.link          ||
                data?.data?.url     ||
                data?.data?.link    ||
                (data?.status === true && typeof data?.result === 'string' ? data.result : null) ||
                null;

            if (url && typeof url === 'string' && url.startsWith('http')) {
                console.log(`✅ Got URL from: ${endpoint}`);
                return { url, title: data?.title || data?.result?.title || data?.data?.title || null };
            }
        } catch (err) {
            console.log(`❌ Failed (${err.message}): ${endpoint}`);
        }
    }
    return null;
}

// Download buffer from a URL, no size cap
async function fetchBuffer(url, timeoutMs = 120000) {
    const { data } = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: timeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });
    return Buffer.from(data);
}

// ─── PLAY (audio) ─────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "play",
        aliases: ["music", "song", "ytmp3", "yta", "audio"],
        category: "downloader",
        react: "🎶",
        description: "Download and send audio from YouTube. Usage: .play <song name or URL>",
    },
    async (from, Gifted, conText) => {
        const { q, reply, react, mek, botFooter } = conText;

        if (!q || !q.trim()) {
            await react("❌");
            return reply(
                `🎶 *Usage:* .play <song name or YouTube URL>\n\n` +
                `*Examples:*\n` +
                `◈ .play Shape of You\n` +
                `◈ .play https://youtu.be/JGwWNGJdvx8\n\n` +
                `> _${botFooter || "Powered by GURUTECH"}_`
            );
        }

        await react("🔍");

        let videoUrl, title, duration, thumbnail;

        try {
            if (isYtUrl(q.trim())) {
                // Direct YouTube URL
                videoUrl = q.trim();
                try {
                    const videoId = videoUrl.includes('v=')
                        ? videoUrl.split('v=')[1]?.split('&')[0]
                        : videoUrl.split('/').pop()?.split('?')[0];
                    const info = await yts({ videoId });
                    title     = info?.title     || "Unknown";
                    duration  = info?.timestamp || "—";
                    thumbnail = info?.thumbnail || info?.image || null;
                } catch {
                    title = "Track"; duration = "—"; thumbnail = null;
                }
            } else {
                // Search query
                const search = await yts(q.trim());
                const video  = search?.videos?.[0];
                if (!video) {
                    await react("❌");
                    return reply(`❌ No results found for: *${q}*\nTry a different search term or paste a YouTube link directly.`);
                }
                videoUrl  = video.url;
                title     = video.title     || "Unknown";
                duration  = video.timestamp || video.duration || "—";
                thumbnail = video.thumbnail || video.image    || null;
            }
        } catch (err) {
            await react("❌");
            return reply(`❌ Search failed: ${err.message}`);
        }

        await react("⬇️");
        await reply(`⏳ *Downloading:* ${title}\n⏱️ ${duration}\n\n_Please wait…_`);

        const resolved = await resolveDownloadUrl(audioApis(videoUrl));

        if (!resolved) {
            await react("❌");
            return reply(
                `❌ All download services are currently busy.\n\n` +
                `Try again in a moment, or send a direct YouTube link.\n\n` +
                `> _${botFooter || "Powered by GURUTECH"}_`
            );
        }

        let buffer;
        try {
            buffer = await fetchBuffer(resolved.url);
        } catch (err) {
            await react("❌");
            return reply(`❌ Failed to fetch audio file: ${err.message}`);
        }

        if (!isValidBuffer(buffer)) {
            await react("❌");
            return reply(`❌ Downloaded file is empty or corrupted. Please try again.`);
        }

        await Gifted.sendMessage(
            from,
            {
                audio:    buffer,
                mimetype: "audio/mpeg",
                ptt:      false,
                fileName: `${(resolved.title || title).replace(/[^\w\s.-]/g, '')}.mp3`,
            },
            { quoted: mek }
        );

        await react("✅");
    }
);

// ─── VIDEO ────────────────────────────────────────────────────────────────────

gmd(
    {
        pattern: "video",
        aliases: ["ytmp4", "mp4", "dlmp4", "ytv"],
        category: "downloader",
        react: "🎥",
        description: "Download and send video from YouTube. Usage: .video <title or URL>",
    },
    async (from, Gifted, conText) => {
        const { q, reply, react, mek, botFooter } = conText;

        if (!q || !q.trim()) {
            await react("❌");
            return reply(
                `🎥 *Usage:* .video <title or YouTube URL>\n\n` +
                `*Examples:*\n` +
                `◈ .video Blinding Lights\n` +
                `◈ .video https://youtu.be/fHI8X4OXluQ\n\n` +
                `> _${botFooter || "Powered by GURUTECH"}_`
            );
        }

        await react("🔍");

        let videoUrl, title, duration;

        try {
            if (isYtUrl(q.trim())) {
                videoUrl = q.trim();
                try {
                    const videoId = videoUrl.includes('v=')
                        ? videoUrl.split('v=')[1]?.split('&')[0]
                        : videoUrl.split('/').pop()?.split('?')[0];
                    const info = await yts({ videoId });
                    title    = info?.title     || "Unknown";
                    duration = info?.timestamp || "—";
                } catch {
                    title = "Video"; duration = "—";
                }
            } else {
                const search = await yts(q.trim());
                const video  = search?.videos?.[0];
                if (!video) {
                    await react("❌");
                    return reply(`❌ No results found for: *${q}*`);
                }
                videoUrl = video.url;
                title    = video.title     || "Unknown";
                duration = video.timestamp || video.duration || "—";
            }
        } catch (err) {
            await react("❌");
            return reply(`❌ Search failed: ${err.message}`);
        }

        await react("⬇️");
        await reply(`⏳ *Downloading:* ${title}\n⏱️ ${duration}\n\n_Please wait…_`);

        const resolved = await resolveDownloadUrl(videoApis(videoUrl));

        if (!resolved) {
            await react("❌");
            return reply(
                `❌ All download services are currently busy. Please try again later.\n\n` +
                `> _${botFooter || "Powered by GURUTECH"}_`
            );
        }

        let buffer;
        try {
            buffer = await fetchBuffer(resolved.url);
        } catch (err) {
            await react("❌");
            return reply(`❌ Failed to fetch video file: ${err.message}`);
        }

        if (!isValidBuffer(buffer)) {
            await react("❌");
            return reply(`❌ Downloaded file is empty or corrupted. Please try again.`);
        }

        const sizeMB = (buffer.length / (1024 * 1024)).toFixed(1);

        await Gifted.sendMessage(
            from,
            {
                video:    buffer,
                mimetype: "video/mp4",
                caption:  `🎬 *${resolved.title || title}*\n⏱️ ${duration}\n📦 ${sizeMB} MB`,
            },
            { quoted: mek }
        );

        await react("✅");
    }
);
