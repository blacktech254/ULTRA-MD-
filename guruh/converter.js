
const { gmd, toAudio, toVideo, toPtt, stickerToImage, gmdFancy, gmdRandom, getSetting, runFFmpeg, getVideoDuration, gmdSticker } = require("../guru");
const fs = require("fs").promises;
const { StickerTypes } = require("wa-sticker-formatter");
const { exec } = require("child_process");

function ffmpegRun(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, _stdout, stderr) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve();
        });
    });
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
    const { mek, reply, react, quoted, quotedMsg, botFooter, sender, botName, newsletterJid } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a sticker message.");
    }

    const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
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

        // Convert webp → mp4 using ffmpeg
        await ffmpegRun(
            `ffmpeg -i "${tempWebp}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" "${tempMp4}" -y`
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
    const { mek, reply, react, quoted, quotedMsg, packName, packAuthor } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a GIF message.");
    }

    // GIFs can arrive as imageMessage (gif mimetype) or videoMessage (gifPlayback=true)
    const quotedImg   = quoted?.imageMessage || quoted?.message?.imageMessage;
    const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;

    const isGifImage = quotedImg && (quotedImg.mimetype?.includes("gif") || quotedImg.gifPlayback);
    const isGifVideo = quotedVideo?.gifPlayback === true;

    const gifMsg = isGifImage ? quotedImg : isGifVideo ? quotedVideo : null;
    if (!gifMsg) {
        await react("❌");
        return reply("The quoted message is not a GIF. Send a GIF and reply to it with this command.");
    }

    let tempGif, tempFile;
    try {
        const filePath = await Gifted.downloadAndSaveMediaMessage(gifMsg, "temp_media");
        const gifBuffer = await fs.readFile(filePath);
        await fs.unlink(filePath).catch(() => {});

        // If it came as video/mp4, convert to gif first so gmdSticker can handle it
        if (isGifVideo) {
            tempGif = gmdRandom(".gif");
            tempFile = gmdRandom(".mp4");
            await fs.writeFile(tempFile, gifBuffer);
            await ffmpegRun(
                `ffmpeg -i "${tempFile}" -vf "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${tempGif}" -y`
            );
        } else {
            tempGif = gmdRandom(".gif");
            await fs.writeFile(tempGif, gifBuffer);
        }

        const stickerBuffer = await gmdSticker(tempGif, {
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
        await reply("Failed to convert GIF to sticker: " + e.message);
    } finally {
        if (tempGif)  await fs.unlink(tempGif).catch(() => {});
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
    const { q, mek, reply, react, quoted, quotedMsg, botFooter, sender, botName, newsletterJid } = conText;

    if (!quotedMsg) {
        await react("❌");
        return reply("Please reply to a video message.");
    }

    const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;
    if (!quotedVideo) {
        await react("❌");
        return reply("The quoted message is not a video.");
    }

    const isHQ = q?.includes("--hq") || q?.includes("-hq");
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

        // Two-pass palette GIF for best quality
        await ffmpegRun(
            `ffmpeg -i "${tempMp4}" -vf "fps=${fps},scale=${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 -t 10 "${tempGif}" -y`
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


