# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run cabinet        # Start cabinet with all games (http://localhost:3000)
pnpm run dev            # Development mode with hot reload
pnpm run game <name>    # Run single game directly (e.g., pnpm run game pong)
pnpm run build          # Build for production with Vite
```

Games require their own dependencies: `cd games/<name> && pnpm install`

## Architecture

CAB is a virtual arcade cabinet that loads games via iframes. The cabinet and games run as separate servers.

**Runtime flow:**
1. Cabinet server (Express) starts on port 3000
2. User selects a game from the retro TV menu
3. GameManager spawns the game as a child process on ports 3001+
4. Game loads in an iframe within the cabinet UI
5. Escape detection (hold 1.5s or 3x rapid press) signals return to menu via WebSocket

**Key components:**
- `src/server/game-manager.ts` - Spawns/kills game processes, monitors startup
- `src/server/port-manager.ts` - Allocates ports 3001-3099 for games
- `src/client/scripts/main.js` - Cabinet class orchestrates UI states (off/boot/menu/playing)
- `src/client/scripts/menu.js` - Game selection with keyboard/mouse navigation
- `src/client/scripts/game-frame.js` - Manages game iframe lifecycle

**Local vs Production:**
- Local: Node processes spawned per game
- Vercel: Games deployed as separate static sites, cabinet reads `GAMES_CONFIG` env var

## Adding Games

Games are standalone Express servers in `games/<name>/`. Required structure:

```
games/<name>/
├── package.json      # Must include cabinet.displayName and cabinet.instructions
├── server.ts         # Express server accepting --port argument
├── vercel.json       # { "buildCommand": null, "outputDirectory": "public" }
└── public/
    └── index.html    # Game entry point
```

The cabinet discovers games from `cabinet.config.json` (local) or `GAMES_CONFIG` (production).
