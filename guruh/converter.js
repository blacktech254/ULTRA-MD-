
const { gmd, toAudio, toVideo, toPtt, stickerToImage, gmdFancy, gmdRandom, getSetting, runFFmpeg, getVideoDuration, gmdSticker } = require("../guru");
const fs = require("fs").promises;
const { StickerTypes } = require("wa-sticker-formatter");
const { exec, execSync } = require("child_process");
const axios = require("axios");

// Resolve ffmpeg binary: prefer ffmpeg-static, fall back to system ffmpeg
let _ffmpegBin;
try {
    const sp = require('ffmpeg-static');
    const fss = require('fs');
    _ffmpegBin = (sp && fss.existsSync(sp)) ? sp : execSync('which ffmpeg').toString().trim();
} catch (_) {
    try { _ffmpegBin = execSync('which ffmpeg').toString().trim(); } catch (__) { _ffmpegBin = 'ffmpeg'; }
}

function ffmpegRun(cmd) {
    // Replace leading bare 'ffmpeg' with the resolved binary path
    const resolvedCmd = cmd.replace(/^ffmpeg\b/, `"${_ffmpegBin}"`);
    return new Promise((resolve, reject) => {
        exec(resolvedCmd, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve();
        });
    });
}

// Check magic bytes to tell WebP from MP4/other
function detectMediaType(buf) {
    if (buf.length < 12) return "unknown";
    const riff = buf.slice(0, 4).toString("ascii");
    const webp = buf.slice(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") return "webp";
    // ftyp box sits at offset 4 in MP4
    const ftyp = buf.slice(4, 8).toString("ascii");
    if (ftyp === "ftyp") return "mp4";
    return "other";
}

// Convert an emoji string to the Twemoji hex code
function emojiToCode(emoji) {
    return [...emoji]
        .map(c => c.codePointAt(0).toString(16))
        .filter(cp => cp !== "fe0f")   // strip variation selector-16
        .join("-");
}

gmd({
    pattern: "sticker",
    aliases: ["st", "take"],
    category: "converter",
    react: "🔄️",
    description: "Convert image/video/sticker to sticker.",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, quoted, packName, packAuthor } = conText;

    try {
        if (!quoted) {
            await react("❌");
            return reply("Please reply to/quote an image, video or sticker");
        }

        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;

        if (!quotedImg && !quotedSticker && !quotedVideo) {
            await react("❌");
            return reply("That quoted message is not an image, video or sticker");
        }

        let tempFilePath;
        try {
            if (quotedImg || quotedVideo) {
                tempFilePath = await Gifted.downloadAndSaveMediaMessage(
                    quotedImg || quotedVideo,
                    "temp_media"
                );

                let fileExt = quotedImg ? ".jpg" : ".mp4";
                let mediaFile = gmdRandom(fileExt);
                const data = await fs.readFile(tempFilePath);
                await fs.writeFile(mediaFile, data);

                // 🔥 If video → convert to webp
                if (quotedVideo) {
                    const compressedFile = gmdRandom(".webp");
                    let duration = 8; // default duration
                    
                    try {
                        duration = await getVideoDuration(mediaFile);
                        if (duration > 10) duration = 10; // trim to first 10 seconds
                    } catch (e) {
                        console.error("Using default duration due to error:", e);
                    }
                    
                    await runFFmpeg(mediaFile, compressedFile, 320, 15, duration);
                    await fs.unlink(mediaFile).catch(() => {});
                    mediaFile = compressedFile;
                }

                const stickerBuffer = await gmdSticker(mediaFile, {
                    pack: packName || "ULTRA GURU", 
                    author: packAuthor || "GURU-TECH",
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(mediaFile).catch(() => {});
                await react("✅");
                return Gifted.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });

            } else if (quotedSticker) {
                // Sticker → Sticker (recompress if too big)
                tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, "temp_media");
                const stickerData = await fs.readFile(tempFilePath);
                const stickerFile = gmdRandom(".webp");
                await fs.writeFile(stickerFile, stickerData);

                const newStickerBuffer = await gmdSticker(stickerFile, {
                    pack: packName || "ULTRA GURU", 
                    author: packAuthor || "GURU-TECH",
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(stickerFile).catch(() => {});
                await react("✅");
                return Gifted.sendMessage(from, { sticker: newStickerBuffer }, { quoted: mek });
            }
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
        }
    } catch (e) {
        console.error("Error in sticker command:", e);
        await react("❌");
        await reply("Failed to convert to sticker");
    }
});


gmd({
    pattern: "toimg",
    aliases: ["s2img"],
    category: "converter",
    react: "🔄️",
    description: "Convert Sticker to Image.",
}, async (from, Gifted, conText) => {
    const { mek, reply, sender, botName, react, quoted, botFooter, quotedMsg, newsletterJid } = conText;

    try {
        if (!quotedMsg) {
            await react("❌");
            return reply("Please reply to/quote a sticker");
        }
        
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        if (!quotedSticker) {
            await react("❌");
            return reply("That quoted message is not a sticker");
        }
        
        let tempFilePath;
        try {
            tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, 'temp_media');
            const stickerBuffer = await fs.readFile(tempFilePath);
            const imageBuffer = await stickerToImage(stickerBuffer);  
        await Gifted.sendMessage(
        from,
        {
          image: imageBuffer,
          caption: `*Here is your image*\n\n> *${botFooter}*`,
          contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 143
            },
          },
        },
        { quoted: mek }
      );
            await react("✅");
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
        }
    } catch (e) {
        console.error("Error in toimg command:", e);
        await react("❌");
        await reply("Failed to convert sticker to image");
    }
});


gmd({
    pattern: "toaudio",
    aliases: ['tomp3'],
    category: "converter",
    react: "🔄️",
    description: "Convert video to audio"
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg, newsletterUrl } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to a video message");
    }

    const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage || quoted?.pvtMessage || quoted?.message?.pvtMessage;
    
    if (!quotedVideo) {
      await react("❌");
      return reply("The quoted message doesn't contain any video");
    }

    let tempFilePath;
    try {
      tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedVideo, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toAudio(buffer);
      
      await Gifted.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/mpeg",
        externalAdReply: {
          title: 'Converted Audio',
          body: 'Video to Audio',
          mediaType: 1,
          thumbnailUrl: botPic,
          sourceUrl: newsletterUrl,
          renderLargerThumbnail: false,
          showAdAttribution: true,
        }
      }, { quoted: mek });
      
      await react("✅");
    } catch (e) {
      console.error("Error in toaudio command:", e);
      await react("❌");
      const errMsg = e.message || String(e);
      if (errMsg.includes('no audio')) {
        await reply("This video has no audio track to extract.");
      } else {
        await reply("Failed to convert video to audio");
      }
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);


gmd({
    pattern: "toptt",
    aliases: ['tovoice', 'tovn', 'tovoicenote'],
    category: "converter",
    react: "🎙️",
    description: "Convert audio to WhatsApp voice note"
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to an audio message");
    }

    const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
    
    if (!quotedAudio) {
      await react("❌");
      return reply("The quoted message doesn't contain any audio");
    }

    let tempFilePath;
    try {
      tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toPtt(buffer);
      
      await Gifted.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      }, { quoted: mek });
      
      await react("✅");
    } catch (e) {
      console.error("Error in toptt command:", e);
      await react("❌");
      await reply("Failed to convert to voice note");
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);


gmd({
    pattern: "tovideo",
    aliases: ['tomp4', 'tovid', 'toblackscreen', 'blackscreen'],
    category: "converter",
    react: "🎥",
    description: "Convert audio to video with black screen"
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to an audio message");
    }

    const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
    
    if (!quotedAudio) {
      await react("❌");
      return reply("The quoted message doesn't contain any audio");
    }

    let tempFilePath;
    try {
      tempFilePath = await Gifted.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toVideo(buffer);
      
      await Gifted.sendMessage(from, {
        video: convertedBuffer,
        mimetype: "video/mp4",
        caption: 'Converted Video',
      }, { quoted: mek });
      
      await react("✅");
    } catch (e) {
      console.error("Error in tovideo command:", e);
      await react("❌");
      await reply("Failed to convert audio to video");
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);


gmd({
    pattern: "s2vid",
    aliases: ["stickertovid", "stickertovideo", "webptovid", "webptomp4"],
    category: "converter",
    react: "🎥",
    description: "Convert a sticker (animated or static) to an MP4 video. Reply to a sticker."
}, async (from, Gifted, conText) => {
    const { mek, reply, react, quotedMsg, botFooter, sender, botName, newsletterJid } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a sticker message.");
    }

    const quotedSticker = quotedMsg?.stickerMessage || quotedMsg?.message?.stickerMessage;
    if (!quotedSticker) {
        await react("❌");
        return reply("The quoted message is not a sticker.");
    }

    let tempWebp, tempMp4;
    try {
        const filePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, "temp_media");
        const stickerBuffer = await fs.readFile(filePath);
        await fs.unlink(filePath).catch(() => {});

        tempWebp = gmdRandom(".webp");
        tempMp4  = gmdRandom(".mp4");
        await fs.writeFile(tempWebp, stickerBuffer);

        // webp → mp4: -r sets output framerate, -t caps to 10s, explicit libx264
        await ffmpegRun(
            `ffmpeg -i "${tempWebp}" -c:v libx264 -pix_fmt yuv420p -movflags faststart -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -r 15 -t 10 "${tempMp4}" -y`
        );

        const videoBuffer = await fs.readFile(tempMp4);
        await Gifted.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `🎥 *Sticker → Video*\n\n> _${botFooter}_`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 5,
                isForwarded: true,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName: botName, serverMessageId: 144 }
            }
        }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("[s2vid] Error:", e.message);
        await react("❌");
        await reply("Failed to convert sticker to video: " + e.message);
    } finally {
        if (tempWebp) await fs.unlink(tempWebp).catch(() => {});
        if (tempMp4)  await fs.unlink(tempMp4).catch(() => {});
    }
});


gmd({
    pattern: "gif2st",
    aliases: ["giftosticker", "giftost", "animatedsticker"],
    category: "converter",
    react: "🔄️",
    description: "Convert a GIF to an animated sticker. Reply to a GIF message."
}, async (from, Gifted, conText) => {
    const { mek, reply, react, quotedMsg, packName, packAuthor } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a GIF message.");
    }

    // GIFs arrive as imageMessage (gif mimetype) or videoMessage (gifPlayback=true)
    const quotedImg   = quotedMsg?.imageMessage   || quotedMsg?.message?.imageMessage;
    const quotedVideo = quotedMsg?.videoMessage   || quotedMsg?.message?.videoMessage;

    const isGifImage = !!quotedImg && (quotedImg.mimetype?.includes("gif") || !!quotedImg.gifPlayback);
    const isGifVideo = !!quotedVideo;   // accept any video – wa-sticker-formatter handles mp4→animated webp

    const mediaMsg = isGifImage ? quotedImg : isGifVideo ? quotedVideo : null;
    if (!mediaMsg) {
        await react("❌");
        return reply("The quoted message is not a GIF or video. Reply to a GIF/video with this command.");
    }

    let tempFile;
    try {
        const filePath = await Gifted.downloadAndSaveMediaMessage(mediaMsg, "temp_media");
        const mediaBuffer = await fs.readFile(filePath);
        await fs.unlink(filePath).catch(() => {});

        const ext = isGifImage ? ".gif" : ".mp4";
        tempFile = gmdRandom(ext);
        await fs.writeFile(tempFile, mediaBuffer);

        // wa-sticker-formatter natively handles both .gif and .mp4 → animated webp
        const stickerBuffer = await gmdSticker(tempFile, {
            pack: packName || "ULTRA GURU",
            author: packAuthor || "GURU-TECH",
            type: StickerTypes.FULL,
            categories: ["🤩", "🎉"],
            id: "12345",
            quality: 75,
            background: "transparent"
        });

        await Gifted.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("[gif2st] Error:", e.message);
        await react("❌");
        await reply("Failed to convert to animated sticker: " + e.message);
    } finally {
        if (tempFile) await fs.unlink(tempFile).catch(() => {});
    }
});


gmd({
    pattern: "vid2gif",
    aliases: ["videotogif", "mp4togif", "togif"],
    category: "converter",
    react: "🔄️",
    description: "Convert a video to a GIF. Reply to a video. Use --hq for higher quality."
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, quotedMsg, botFooter, sender, botName, newsletterJid } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a video message.");
    }

    const quotedVideo = quotedMsg?.videoMessage || quotedMsg?.message?.videoMessage;
    if (!quotedVideo) {
        await react("❌");
        return reply("The quoted message is not a video.");
    }

    const isHQ  = q?.includes("--hq") || q?.includes("-hq");
    const scale = isHQ ? 480 : 320;
    const fps   = isHQ ? 15 : 10;

    let tempMp4, tempGif;
    try {
        const filePath = await Gifted.downloadAndSaveMediaMessage(quotedVideo, "temp_media");
        const videoBuffer = await fs.readFile(filePath);
        await fs.unlink(filePath).catch(() => {});

        tempMp4 = gmdRandom(".mp4");
        tempGif = gmdRandom(".gif");
        await fs.writeFile(tempMp4, videoBuffer);

        // Palette-based GIF for quality — MUST use -filter_complex, not -vf, for split
        await ffmpegRun(
            `ffmpeg -i "${tempMp4}" -filter_complex "[0:v]fps=${fps},scale=${scale}:-1,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 -t 10 "${tempGif}" -y`
        );

        const gifBuffer = await fs.readFile(tempGif);
        await Gifted.sendMessage(from, {
            image: gifBuffer,
            mimetype: "image/gif",
            caption: `🎞️ *Video → GIF*${isHQ ? " (HQ)" : ""}\n\n> _${botFooter}_`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 5,
                isForwarded: true,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName: botName, serverMessageId: 145 }
            }
        }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("[vid2gif] Error:", e.message);
        await react("❌");
        await reply("Failed to convert video to GIF: " + e.message);
    } finally {
        if (tempMp4) await fs.unlink(tempMp4).catch(() => {});
        if (tempGif) await fs.unlink(tempGif).catch(() => {});
    }
});


gmd({
    pattern: "emojisticker",
    aliases: ["esticker", "emojist", "e2sticker"],
    category: "converter",
    react: "😄",
    description: "Convert an emoji to a sticker. Usage: .emojisticker 😂"
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, packName, packAuthor } = conText;

    const raw = (q || "").trim();
    if (!raw) {
        await react("❌");
        return reply(`Please provide an emoji.\nUsage: *.emojisticker* 😂`);
    }

    const emojiMatch = raw.match(/\p{Emoji}/u);
    if (!emojiMatch) {
        await react("❌");
        return reply("No emoji detected. Please send a valid emoji. Example: *.emojisticker* 🔥");
    }
    const emoji = emojiMatch[0];
    const code  = emojiToCode(emoji);

    const urls = [
        `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${code}.png`,
        `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${code}.png`,
    ];

    let pngBuffer;
    for (const url of urls) {
        try {
            const res = await axios.get(url, { responseType: "arraybuffer", timeout: 10000 });
            pngBuffer = Buffer.from(res.data);
            break;
        } catch (_) {}
    }

    if (!pngBuffer) {
        await react("❌");
        return reply(`❌ Could not find Twemoji image for *${emoji}* (code: \`${code}\`).\nOnly standard emojis are supported.`);
    }

    let tempPng;
    try {
        tempPng = gmdRandom(".png");
        await fs.writeFile(tempPng, pngBuffer);

        const stickerBuffer = await gmdSticker(tempPng, {
            pack:   packName   || "ULTRA GURU",
            author: packAuthor || "GURU-TECH",
            type:   StickerTypes.FULL,
            categories: ["🤩", "🎉"],
            id:     "12345",
            quality: 90,
            background: "transparent"
        });

        await Gifted.sendMessage(from, { sticker: stickerBuffer }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("[emojisticker] Error:", e.message);
        await react("❌");
        await reply("Failed to create emoji sticker: " + e.message);
    } finally {
        if (tempPng) await fs.unlink(tempPng).catch(() => {});
    }
});


gmd({
    pattern: "s2real",
    aliases: ["sticker2real", "realvideo", "vstickertomp4"],
    category: "converter",
    react: "🎬",
    description: "Convert a video sticker to a real MP4 with original audio (if present). Reply to a sticker."
}, async (from, Gifted, conText) => {
    const { mek, reply, react, quotedMsg, botFooter, sender, botName, newsletterJid } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a sticker message.");
    }

    const quotedSticker = quotedMsg?.stickerMessage || quotedMsg?.message?.stickerMessage;
    if (!quotedSticker) {
        await react("❌");
        return reply("The quoted message is not a sticker.");
    }

    let tempInput, tempMp4;
    try {
        const filePath = await Gifted.downloadAndSaveMediaMessage(quotedSticker, "temp_media");
        const rawBuffer = await fs.readFile(filePath);
        await fs.unlink(filePath).catch(() => {});

        const mediaType = detectMediaType(rawBuffer);

        if (mediaType === "mp4") {
            // Already an MP4-based video sticker — send directly with original audio intact
            await Gifted.sendMessage(from, {
                video: rawBuffer,
                mimetype: "video/mp4",
                caption: `🎬 *Video Sticker → Real Video*\n🔊 _Audio preserved_\n\n> _${botFooter}_`,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 5,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: { newsletterJid, newsletterName: botName, serverMessageId: 146 }
                }
            }, { quoted: mek });
            return await react("✅");
        }

        // WebP sticker → MP4 (audio not recoverable for WebP)
        tempInput = gmdRandom(".webp");
        tempMp4   = gmdRandom(".mp4");
        await fs.writeFile(tempInput, rawBuffer);

        // Check if it's an animated WebP (ANIM chunk) — ffmpeg's webp_pipe
        // cannot decode multi-frame animated WebP. Fix: sharp → GIF → ffmpeg → MP4.
        let isAnimated = false;
        try {
            const sharp = require("sharp");
            const meta = await sharp(rawBuffer, { animated: true }).metadata();
            isAnimated = meta.pages && meta.pages > 1;
        } catch (_) {}

        if (isAnimated) {
            const tempGif = gmdRandom(".gif");
            try {
                const sharp = require("sharp");
                const gifBuffer = await sharp(rawBuffer, { animated: true }).gif().toBuffer();
                await fs.writeFile(tempGif, gifBuffer);
                await ffmpegRun(
                    `ffmpeg -i "${tempGif}" -c:v libx264 -pix_fmt yuv420p -movflags faststart -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${tempMp4}" -y`
                );
            } finally {
                await fs.unlink(tempGif).catch(() => {});
            }
        } else {
            await ffmpegRun(
                `ffmpeg -i "${tempInput}" -c:v libx264 -pix_fmt yuv420p -movflags faststart -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -r 15 -t 10 "${tempMp4}" -y`
            );
        }

        const videoBuffer = await fs.readFile(tempMp4);
        await Gifted.sendMessage(from, {
            video: videoBuffer,
            mimetype: "video/mp4",
            caption: `🎬 *Animated Sticker → Video*\n⚠️ _WebP sticker — audio is not recoverable_\n\n> _${botFooter}_`,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 5,
                isForwarded: true,
                forwardedNewsletterMessageInfo: { newsletterJid, newsletterName: botName, serverMessageId: 146 }
            }
        }, { quoted: mek });
        await react("✅");
    } catch (e) {
        console.error("[s2real] Error:", e.message);
        await react("❌");
        await reply("Failed to convert sticker to real video: " + e.message);
    } finally {
        if (tempInput) await fs.unlink(tempInput).catch(() => {});
        if (tempMp4)   await fs.unlink(tempMp4).catch(() => {});
    }
});


