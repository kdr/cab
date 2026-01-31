import { spawn, ChildProcess } from 'child_process';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import treeKill from 'tree-kill';
import { PortManager } from './port-manager.js';

export interface GameInfo {
  name: string;
  path: string;
  displayName?: string;
  description?: string;
  instructions?: string;
}

export interface RunningGame {
  name: string;
  port: number;
  process: ChildProcess;
}

export class GameManager {
  private gamesDirectory: string;
  private portManager: PortManager;
  private currentGame: RunningGame | null = null;

  constructor(gamesDirectory: string, portManager: PortManager) {
    this.gamesDirectory = resolve(process.cwd(), gamesDirectory);
    this.portManager = portManager;
  }

  async listGames(): Promise<GameInfo[]> {
    const { readdirSync } = await import('fs');
    const games: GameInfo[] = [];

    if (!existsSync(this.gamesDirectory)) {
      return games;
    }

    const entries = readdirSync(this.gamesDirectory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const gamePath = resolve(this.gamesDirectory, entry.name);
        const packageJsonPath = resolve(gamePath, 'package.json');
        if (existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            games.push({
              name: entry.name,
              path: gamePath,
              displayName: packageJson.cabinet?.displayName || packageJson.name,
              description: packageJson.description,
              instructions: packageJson.cabinet?.instructions,
            });
          } catch {
            games.push({ name: entry.name, path: gamePath });
          }
        }
      }
    }

    return games;
  }

  async startGame(name: string): Promise<{ port: number }> {
    if (this.currentGame) {
      await this.stopGame();
    }

    const gamePath = resolve(this.gamesDirectory, name);
    if (!existsSync(gamePath)) {
      throw new Error(`Game "${name}" not found`);
    }

    const port = await this.portManager.allocate();

    const gameProcess = spawn('pnpm', ['run', 'server', '--', `--port=${port}`], {
      cwd: gamePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    gameProcess.stdout?.on('data', (data) => {
      console.log(`[${name}] ${data.toString().trim()}`);
    });

    gameProcess.stderr?.on('data', (data) => {
      console.error(`[${name}] ${data.toString().trim()}`);
    });

    gameProcess.on('exit', (code) => {
      console.log(`[${name}] Process exited with code ${code}`);
      if (this.currentGame?.name === name) {
        this.portManager.release(port);
        this.currentGame = null;
      }
    });

    this.currentGame = { name, port, process: gameProcess };

    // Wait for game server to be ready
    await this.waitForServer(port);

    return { port };
  }

  async stopGame(): Promise<void> {
    if (!this.currentGame) {
      return;
    }

    const { name, port, process } = this.currentGame;

    return new Promise((resolve) => {
      treeKill(process.pid!, 'SIGTERM', (err) => {
        if (err) {
          console.error(`Error killing ${name}:`, err);
        }
        this.portManager.release(port);
        this.currentGame = null;
        resolve();
      });
    });
  }

  getCurrentGame(): RunningGame | null {
    return this.currentGame;
  }

  private async waitForServer(port: number, timeout = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok) {
          return;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    throw new Error(`Game server did not start within ${timeout}ms`);
  }
}
