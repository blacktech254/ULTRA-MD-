# ULTRA GURU MD — WhatsApp Bot

A powerful multi-device WhatsApp bot built with Node.js and the Baileys library. It provides automation, utility tools, games, media downloading, and automated moderation features.

## Setup

1. Get a WhatsApp Session ID by using the pairing/session page at the hosted URL
2. Add `SESSION_ID` to Replit Secrets (format: `GURU~xxxxxxxx...`)
3. The bot will automatically connect to WhatsApp once the session is set

## Environment Variables (Replit Secrets)

| Variable | Required | Description |
|---|---|---|
| `SESSION_ID` | **Yes** | WhatsApp session token (format: `GURU~...`) |
| `MODE` | No | `public` or `private` (default: public) |
| `BOT_NAME` | No | Name of the bot (default: ULTRA GURU) |
| `OWNER_NAME` | No | Owner's name |
| `OWNER_NUMBER` | No | Owner's WhatsApp number (without +) |
| `TIME_ZONE` | No | Timezone e.g. `Africa/Nairobi` |
| `AUTO_READ_STATUS` | No | Auto-view statuses: `true`/`false` |
| `AUTO_LIKE_STATUS` | No | Auto-like statuses: `true`/`false` |
| `DATABASE_URL` | No | PostgreSQL connection URL (falls back to SQLite) |
| `BOT_EXPIRY_DATE` | No | Licence expiry date (YYYY-MM-DD) |

## Running

```
npm start
```

The Express web server runs on port 5000. When `SESSION_ID` is not set, the server stays alive serving the dashboard but the WhatsApp connection is paused.

## Tech Stack

- **Runtime**: Node.js 20
- **WhatsApp**: @whiskeysockets/baileys
- **Web server**: Express.js (port 5000)
- **Database**: SQLite (default) or PostgreSQL
- **Media**: ffmpeg, sharp, jimp

## User Preferences

- Use npm with `--legacy-peer-deps` flag for installs
- The `wa-sticker-formatter` package has its own `sharp` dependency that must be rebuilt after fresh installs: `cd node_modules/wa-sticker-formatter && npm rebuild sharp --platform=linux --arch=x64`
