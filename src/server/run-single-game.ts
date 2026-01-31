import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { loadConfig } from './config-loader.js';

const config = loadConfig();
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: pnpm run game <game-name>');
  console.error('Example: pnpm run game pong');
  process.exit(1);
}

const gameName = args[0];
const gamePath = resolve(process.cwd(), config.gamesDirectory, gameName);

if (!existsSync(gamePath)) {
  console.error(`Game "${gameName}" not found at ${gamePath}`);
  process.exit(1);
}

const port = config.cabinetPort; // Run on cabinet port when launched directly

console.log(`Starting ${gameName} on http://localhost:${port}`);

const gameProcess = spawn('pnpm', ['run', 'server', '--', `--port=${port}`], {
  cwd: gamePath,
  stdio: 'inherit',
  shell: true,
});

gameProcess.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle cleanup
process.on('SIGINT', () => {
  gameProcess.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  gameProcess.kill('SIGTERM');
});
