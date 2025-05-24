# 🤖 Sierra Discord Bot

A modern Discord bot with beautiful Discord-themed embeds that blend perfectly with Discord's dark mode interface. Built with Discord.js and organized with a clean, categorized command structure.

## ✨ Features

### 🛠️ Utility Commands
- **Ping** - Check bot and API latency with status indicators
- **Help** - Interactive help system with dropdown menu categories and detailed command info
- **Config Ticket** - Configure the ticket system for your server
- **Poll** - Create interactive polls with reaction voting
- **Remind** - Set personal reminders for later
- **Role** - Complete role management tools

### ℹ️ Information Commands
- **Server Info** - Comprehensive server details with formatted timestamps
- **User Info** - Detailed user information with badge display and role listing
- **About** - Information about the bot and its features
- **Avatar** - Display user avatars in full size with format options
- **Server Icon** - View server icon in full size with format options

### 👮 Moderation Commands
- **Kick** - Kick members with proper permission checking and logs
- **Ban** - Permanently ban members from the server
- **Unban** - Remove a ban from a user
- **Timeout** - Temporarily restrict a user's permissions
- **Purge** - Bulk delete messages with filtering options
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
- **Messages** - View your message statistics and rank
- **Leaderboard** - See the top message senders in the server
- **Profile** - Generate a visual profile card with your stats

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
   - Ban Members (for ban/unban commands)
   - Moderate Members (for timeout command)
   - Manage Messages (for purge command)
   - Manage Roles (for role command)
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

## 📋 Command Reference

Below is a complete reference of all available commands organized by category:

### 🛠️ Utility Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/ping` | Check bot and API latency | `/ping` | `/ping` |
| `/help` | Show help for all commands or a specific command | `/help` or `/help command:[command_name]` | `/help` or `/help command:ban` |
| `/configticket` | Configure the ticket system | `/configticket` | `/configticket` |
| `/poll` | Create a simple poll for users to vote on | `/poll question:[question] options:[option1\|option2\|...] duration:[minutes]` | `/poll question:What should we do next? options:Movie Night\|Game Night\|Karaoke duration:60` |
| `/remind` | Set a reminder for yourself | `/remind time:[time] message:[message] private:[true/false]` | `/remind time:1h30m message:Check the deployment status private:true` |
| `/role add` | Add a role to a user | `/role add user:[user] role:[role] reason:[reason]` | `/role add user:@username role:Member reason:Passed verification` |
| `/role remove` | Remove a role from a user | `/role remove user:[user] role:[role] reason:[reason]` | `/role remove user:@username role:Member reason:No longer active` |
| `/role info` | Get information about a role | `/role info role:[role]` | `/role info role:Admin` |

### ℹ️ Information Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/server` | Show information about the server | `/server` | `/server` |
| `/userinfo` | Show information about a user | `/userinfo user:[user]` | `/userinfo user:@username` |
| `/about` | Show information about the bot | `/about` | `/about` |
| `/avatar` | Show a user's avatar in full size | `/avatar user:[user] server_avatar:[true/false]` | `/avatar user:@username server_avatar:true` |
| `/servericon` | Show the server's icon in full size | `/servericon` | `/servericon` |

### 👮 Moderation Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/kick` | Kick a member from the server | `/kick user:[user] reason:[reason]` | `/kick user:@username reason:Spamming` |
| `/ban` | Ban a member from the server | `/ban user:[user] reason:[reason] delete_days:[0-7]` | `/ban user:@username reason:Violating rules delete_days:1` |
| `/unban` | Unban a user from the server | `/unban user_id:[id] reason:[reason]` | `/unban user_id:123456789012345678 reason:Appeal approved` |
| `/timeout` | Timeout a member for a specified duration | `/timeout user:[user] duration:[duration] reason:[reason]` | `/timeout user:@username duration:1h reason:Cool down` |
| `/purge` | Delete multiple messages from a channel | `/purge amount:[1-100] user:[user] silent:[true/false]` | `/purge amount:50 user:@username silent:true` |
| `/warn` | Warn a user for breaking server rules | `/warn user:[user] reason:[reason] silent:[true/false]` | `/warn user:@username reason:Inappropriate behavior silent:false` |
| `/warnings` | View warnings for a user | `/warnings user:[user] private:[true/false]` | `/warnings user:@username private:true` |
| `/clearwarnings` | Clear all warnings from a user | `/clearwarnings user:[user] silent:[true/false]` | `/clearwarnings user:@username silent:false` |
| `/removewarning` | Remove a specific warning from a user | `/removewarning warning_id:[id] silent:[true/false]` | `/removewarning warning_id:abc123 silent:false` |

### 🎮 Fun Commands

| Command | Description | Usage | Example |
|---------|-------------|-------|---------|
| `/eightball` | Ask the Magic 8-Ball a question | `/eightball question:[question]` | `/eightball question:Will I win the lottery?` |
| `/slap` | Slap another user with a GIF | `/slap user:[user] reason:[reason]` | `/slap user:@username reason:Being annoying` |
| `/hug` | Give someone a warm hug with a GIF | `/hug user:[user] message:[message]` | `/hug user:@username message:You're awesome!` |
| `/pat` | Pat someone on the head with a GIF | `/pat user:[user] message:[message]` | `/pat user:@username message:Good job!` |
| `/poke` | Poke someone with a GIF | `/poke user:[user] message:[message]` | `/poke user:@username message:Are you there?` |
| `/distort` | Distort a user's profile picture | `/distort user:[user] effect:[effect]` | `/distort user:@username effect:bulge` |
| `/messages` | View your message statistics | `/messages user:[user]` | `/messages user:@username` |
| `/leaderboard` | View server message leaderboard | `/leaderboard limit:[1-25]` | `/leaderboard limit:10` |
| `/profile` | Generate a visual profile card | `/profile user:[user]` | `/profile user:@username` |

## 📁 Command Structure

Commands are organized into categories:

```
src/
├── commands/
│   ├── utility/    🛠️
│   │   ├── ping.js
│   │   ├── help.js
│   │   ├── configticket.js
│   │   ├── poll.js
│   │   ├── remind.js
│   │   └── role.js
│   ├── info/       ℹ️
│   │   ├── server.js
│   │   ├── userinfo.js
│   │   ├── about.js
│   │   ├── avatar.js
│   │   └── servericon.js
│   ├── moderation/ 👮
│   │   ├── kick.js
│   │   ├── ban.js
│   │   ├── unban.js
│   │   ├── timeout.js
│   │   ├── purge.js
│   │   ├── warn.js
│   │   ├── warnings.js
│   │   ├── clearwarnings.js
│   │   └── removewarning.js
│   └── fun/        🎮
│       ├── eightball.js
│       ├── slap.js
│       ├── hug.js
│       ├── pat.js
│       ├── poke.js
│       ├── distort.js
│       ├── messages.js
│       ├── leaderboard.js
│       └── profile.js
├── utils/          🔧
│   ├── embedCreator.js
│   ├── constants.js
│   ├── imageManipulator.js
│   ├── tenorApiHandler.js
│   └── messageTracker.js
├── data/          📊
│   ├── messages/  # Message statistics
│   └── warnings/  # Warning records
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
