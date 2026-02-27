# CAB - Video Game Cabinet

A virtual video game cabinet with a retro CRT TV monitor interface. Load and play self-contained JavaScript games through a nostalgic arcade experience.

```
 ██████╗ █████╗ ██████╗
██╔════╝██╔══██╗██╔══██╗
██║     ███████║██████╔╝
██║     ██╔══██║██╔══██╗
╚██████╗██║  ██║██████╔╝
 ╚═════╝╚═╝  ╚═╝╚═════╝
```

## Features

- Retro CRT TV aesthetic with scanlines and phosphor glow
- ASCII art boot screen
- Menu navigation with keyboard or mouse
- Hold ESC (1.5s) or rapid press 3x to exit games
- Retro sound effects
- Works locally or deployed to Vercel

## Local Development

### Prerequisites

- Node.js 18+
- pnpm

### Install Dependencies

```bash
# Install cabinet dependencies
pnpm install

# Install game dependencies
cd games/pong && pnpm install && cd ../..
cd games/breakout && pnpm install && cd ../..
cd games/worm && pnpm install && cd ../..
```

### Run the Cabinet

```bash
pnpm run cabinet
```

This starts:
- Cabinet UI at http://localhost:3000
- Game servers automatically on ports 3001+

Open http://localhost:3000 and click the power button to start.

### Run a Single Game (Bypass Cabinet)

```bash
pnpm run game pong
# or
pnpm run game breakout
# or
pnpm run game worm
```

Runs the game directly at http://localhost:3000.

### Development Mode (with hot reload)

```bash
pnpm run dev
```

## Deployment to Vercel

The cabinet and games are deployed as separate Vercel projects.

### 1. Deploy Games

Each game in `games/` is a standalone static site.

**Deploy Pong:**
```bash
cd games/pong
vercel
```

**Deploy Breakout:**
```bash
cd games/breakout
vercel
```

**Deploy Worm:**
```bash
cd games/worm
vercel
```

Note the URLs (e.g., `https://pong-xyz.vercel.app`).

### 2. Deploy Cabinet

From the project root:
```bash
vercel
```

### 3. Configure Environment Variables

In Vercel dashboard, set the following environment variables for the cabinet project:

| Variable | Description |
|----------|-------------|
| `CABINET_NAME` | Display name (default: "CAB") |
| `GAMES_CONFIG` | JSON array of game configurations |

**GAMES_CONFIG format:**
```json
[
  {
    "name": "pong",
    "displayName": "Pong",
    "url": "https://your-pong-deployment.vercel.app",
    "instructions": "Player 1: W/S keys | Player 2: Arrow Up/Down | Press SPACE to start"
  },
  {
    "name": "breakout",
    "displayName": "Breakout",
    "url": "https://your-breakout-deployment.vercel.app",
    "instructions": "Move paddle: Arrow Left/Right or A/D | Press SPACE to launch ball"
  },
  {
    "name": "worm",
    "displayName": "Worm",
    "url": "https://your-worm-deployment.vercel.app",
    "instructions": "Move: WASD or Arrow keys | Press SPACE to start/restart"
  }
]
```

See `.env.production.sample` for a template.

## Adding New Games

1. Create a new folder in `games/`:
   ```
   games/your-game/
   ├── package.json
   ├── server.ts        # Express server for local dev
   ├── vercel.json      # Vercel config
   └── public/
       ├── index.html
       ├── game.js
       └── styles.css
   ```

2. Add cabinet metadata to `package.json`:
   ```json
   {
     "name": "your-game",
     "cabinet": {
       "displayName": "Your Game",
       "instructions": "Controls description here"
     }
   }
   ```

3. For local dev, add a server script:
   ```json
   {
     "scripts": {
       "server": "tsx server.ts"
     }
   }
   ```

4. For Vercel, add `vercel.json`:
   ```json
   {
     "buildCommand": null,
     "outputDirectory": "public"
   }
   ```

## Controls

| Action | Key |
|--------|-----|
| Navigate menu | Arrow Up/Down, W/S |
| Select game | Enter, Space |
| Exit game | Hold ESC (1.5s) or press 3x rapidly |

## Project Structure

```
cab/
├── src/
│   ├── server/          # Express server (local dev)
│   └── client/          # Cabinet UI
├── api/                 # Vercel serverless functions
├── games/
│   ├── pong/
│   └── breakout/
├── vercel.json          # Cabinet Vercel config
└── vite.config.ts       # Build config
```

## License

MIT
