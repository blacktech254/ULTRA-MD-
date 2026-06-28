<div align="center">

<img src="https://res.cloudinary.com/dqxlb29uz/image/upload/v1780267810/bwm_uploads/media-1780267810008.jpg" width="150" style="border-radius:50%"/>

# 🎖️ ULTRA GURU MD 🎖️
### Premium Multi-Device WhatsApp Bot by GURUTECH LAB

[![Version](https://img.shields.io/badge/version-5.0.0-blue?style=for-the-badge)](https://github.com/GuruhTech/ULTRA-GURU)
[![Node](https://img.shields.io/badge/node-20.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)](LICENSE)
[![Telegram](https://img.shields.io/badge/Telegram-GURU__TECHLAB-blue?style=for-the-badge&logo=telegram)](https://t.me/GURU_TECHLAB)

---

## 🚀 Deploy to Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/blacktech254/ULTRA-MD-)

> Click the button above to instantly deploy your own ULTRA GURU MD bot on Heroku.

</div>

---

## ✨ Features

| Category | Features |
|---|---|
| 🤖 **AI & Chat** | ChatBot, AI Replies, Google Translate, Text-to-Speech |
| 📥 **Downloaders** | YouTube, TikTok, Instagram, Facebook, Twitter, Spotify |
| 👥 **Group Tools** | Anti-Link, Anti-Bad, Anti-Bot, Anti-Sticker, Group Management |
| 🎮 **Games** | TicTacToe, Word Games, Economy System |
| 🔒 **Security** | Anti-Delete, Anti-Edit, Anti-Call, Licence Expiry Guard |
| 📊 **Status** | Auto-View, Auto-Like, Auto-Reply to Statuses |
| ⚙️ **Automation** | Auto-React, Auto-Bio, Presence Typing, Scheduled Greetings |
| 📢 **Channels** | Newsletter Follow, Group Invite Accept |

---

## ⚙️ Environment Variables

Configure these when deploying:

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_ID` | ✅ Yes | — | WhatsApp session ID (`GURU~...`) |
| `MODE` | ✅ Yes | `public` | `public` or `private` |
| `TIME_ZONE` | ✅ Yes | `Africa/Nairobi` | Your timezone (e.g. `America/New_York`) |
| `BOT_NAME` | No | `ULTRA GURU` | Display name for your bot |
| `OWNER_NAME` | No | `GURUTECH 😎` | Bot owner name |
| `AUTO_READ_STATUS` | No | `true` | Auto-view WhatsApp statuses |
| `AUTO_LIKE_STATUS` | No | `true` | Auto-like WhatsApp statuses |
| `DATABASE_URL` | No | SQLite fallback | PostgreSQL URL (Neon, Supabase, Heroku Postgres) |
| `BOT_EXPIRY_DATE` | No | — | Licence expiry date `YYYY-MM-DD` |

---

## 🛠️ Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/GuruhTech/ULTRA-GURU.git
cd ULTRA-GURU

# 2. Install dependencies
npm install

# 3. Create a .env file and add your SESSION_ID
echo "SESSION_ID=GURU~your_session_here" > .env

# 4. Start the bot
npm start
```

---

## 🔑 Getting Your SESSION_ID

1. Fork this repo and deploy to Heroku (button above)
2. Open the Heroku app logs or the web interface
3. Follow the on-screen pairing prompt
4. Your session ID will be saved automatically on first run

---

## 📦 Tech Stack

- **Runtime:** Node.js 20.x
- **WhatsApp:** [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) (Multi-Device)
- **Database:** PostgreSQL (via Sequelize) with SQLite fallback
- **Web Server:** Express.js
- **Media:** FFmpeg, Sharp, Jimp

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

<div align="center">

**Made with 💙 by [GURUTECH LAB](https://github.com/GuruhTech)**

[![GitHub Stars](https://img.shields.io/github/stars/GuruhTech/ULTRA-GURU?style=social)](https://github.com/GuruhTech/ULTRA-GURU)
[![GitHub Forks](https://img.shields.io/github/forks/GuruhTech/ULTRA-GURU?style=social)](https://github.com/GuruhTech/ULTRA-GURU/fork)
[![Telegram](https://img.shields.io/badge/Join-Telegram-blue?logo=telegram)](https://t.me/GURU_TECHLAB)

</div>
