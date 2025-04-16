# 🤖 Sierra Discord Bot

A modern Discord bot with beautiful Discord-themed embeds that blend perfectly with Discord's dark mode interface. Built with Discord.js and organized with a clean, categorized command structure.

## ✨ Features

### 🛠️ Utility Commands
- **Ping** - Check bot and API latency with status indicators
- **Help** - Interactive help system with dropdown menu categories and detailed command info
- **Config Ticket** - Configure the ticket system for your server

### ℹ️ Information Commands
- **Server Info** - Comprehensive server details with formatted timestamps
- **User Info** - Detailed user information with badge display and role listing
- **About** - Information about the bot and its features

### 👮 Moderation Commands
- **Kick** - Kick members with proper permission checking and logs
- **Warn** - Warn users with a reason and keep a record
- **Warnings** - See all warnings for a user
- **Clear Warnings** - Remove all warnings from a user
- **Remove Warning** - Remove a specific warning by ID

### 🎮 Fun Commands
- **8ball** - Ask the Magic 8-Ball questions with color-coded responses
- **Slap** - Slap another user with a GIF from Tenor
- **Hug** - Give someone a warm hug with a GIF from Tenor 
- **Pat** - Pat someone on the head with a GIF from Tenor
- **Poke** - Poke someone with a GIF from Tenor
- **Distort** - Apply amusing distortion effects to user profile pictures

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16.9.0 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Discord account and a Discord server where you have administrator permissions

## 🚀 Setting Up

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application and set up a bot
3. Enable necessary intents (SERVER MEMBERS and MESSAGE CONTENT)
4. Generate an invite URL with the following permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Use Slash Commands
   - Read Message History
   - Add Reactions
   - Kick Members (for moderation commands)
5. Invite the bot to your server

## 📥 Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/axiscoder/sierrabot.git
   cd sierrabot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following:
   ```
   # Discord Bot Token
   TOKEN=your_discord_bot_token_here
   
   # Application ID
   CLIENT_ID=your_application_id_here
   
   # Test Guild ID
   GUILD_ID=your_guild_id_here
   
   # Embed Color (Discord dark theme color)
   EMBED_COLOR=2F3136
   
   # Tenor API Key
   TENOR_API_KEY=your_tenor_api_key_here
   ```

4. Deploy commands to your test server:
   ```bash
   npm run deploy
   ```

5. Start the bot:
   ```bash
   npm start
   ```

## 📁 Command Structure

Commands are organized into categories:

```
src/
├── commands/
│   ├── utility/    🛠️
│   │   ├── ping.js
│   │   ├── help.js
│   │   └── configticket.js
│   ├── info/       ℹ️
│   │   ├── server.js
│   │   ├── userinfo.js
│   │   └── about.js
│   ├── moderation/ 👮
│   │   ├── kick.js
│   │   ├── warn.js
│   │   ├── warnings.js
│   │   ├── clearwarnings.js
│   │   └── removewarning.js
│   └── fun/        🎮
│       ├── 8ball.js
│       ├── slap.js
│       ├── hug.js
│       ├── pat.js
│       ├── poke.js
│       └── distort.js
├── utils/          🔧
│   ├── embedCreator.js
│   ├── constants.js
│   ├── imageManipulator.js
│   └── tenorApiHandler.js
├── index.js
└── deploy-commands.js
```

## ➕ Adding New Commands

To add a new command:

1. Create a new JavaScript file in the appropriate category folder
2. Use the existing commands as templates
3. Make sure to include:
   - The `data` property with SlashCommandBuilder configuration
   - The `category` property using a value from CATEGORIES
   - The `execute` function

## 🛠️ Development

- Use `npm run dev` to start the bot with nodemon for auto-reloading
- After adding or modifying commands, run `npm run deploy` to update them

## 📝 Additional Setup

1. **Tenor API Setup**: 
   - Create a Tenor API key at [Tenor Developer Dashboard](https://tenor.com/developer/dashboard)
   - Add your API key to the `.env` file as `TENOR_API_KEY`
   - This is required for GIF commands like Slap, Hug, Pat and Poke

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgements

- [Discord.js](https://discord.js.org/) - The powerful JavaScript library for interacting with Discord's API 
- [Jimp](https://github.com/jimp-dev/jimp) - JavaScript image manipulation library used for the distort command
- [Tenor API](https://tenor.com/developer/documentation) - For providing GIFs for the interaction commands
