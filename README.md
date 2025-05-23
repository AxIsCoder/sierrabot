# Sierra Discord Bot

A feature-rich Discord bot built with Discord.js that provides various utilities, fun commands, and moderation tools.

## Features

- **Message Tracking**: Track and display message statistics for users
- **Moderation**: Warning system, message purging, and more
- **Fun Commands**: Various entertainment commands like memes, gifs, and image manipulation
- **Utility Commands**: Help, reminders, and other useful tools
- **Ticket System**: Create and manage support tickets

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sierra.git
cd sierra
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
TOKEN=your_discord_bot_token
```

4. Deploy slash commands:
```bash
npm run deploy
```

5. Start the bot:
```bash
npm run dev
```

## Commands

### Fun Commands
- `/messages` - Check message statistics for a user
- `/leaderboard` - View message leaderboard for the server
- `/profile` - Generate a visual profile card with stats
- `/meme` - Create and share memes
- `/gif` - Search and share GIFs
- `/filter` - Apply various filters to images
- `/distort` - Distort images in fun ways

### Utility Commands
- `/help` - Display help information
- `/remind` - Set a reminder
- `/poll` - Create a poll
- `/reset` - Reset server statistics (Admin only)

### Moderation Commands
- `/warn` - Issue a warning to a user
- `/purge` - Bulk delete messages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Discord.js](https://discord.js.org/)
- Created by Axody
