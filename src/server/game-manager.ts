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
  url?: string;
}

export interface RunningGame {
  name: string;
  port: number;
  process: ChildProcess;
}

export interface GameWithUrl extends GameInfo {
  url: string;
}

export class GameManager {
  private gamesDirectory: string;
  private portManager: PortManager;
  private currentGame: RunningGame | null = null;
  private runningGames: Map<string, RunningGame> = new Map();
  private gamesWithUrls: GameWithUrl[] = [];

  constructor(gamesDirectory: string, portManager: PortManager) {
    this.gamesDirectory = resolve(process.cwd(), gamesDirectory);
    this.portManager = portManager;
  }

  async startAllGames(): Promise<GameWithUrl[]> {
    const games = await this.listGames();
    this.gamesWithUrls = [];

    for (const game of games) {
      try {
        const port = await this.portManager.allocate();
        const gamePath = game.path;

        const gameProcess = spawn('pnpm', ['run', 'server', '--', `--port=${port}`], {
          cwd: gamePath,
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        gameProcess.stdout?.on('data', (data) => {
          console.log(`[${game.name}] ${data.toString().trim()}`);
        });

        gameProcess.stderr?.on('data', (data) => {
          console.error(`[${game.name}] ${data.toString().trim()}`);
        });

        gameProcess.on('exit', (code) => {
          console.log(`[${game.name}] Process exited with code ${code}`);
          this.runningGames.delete(game.name);
          this.portManager.release(port);
        });

        this.runningGames.set(game.name, { name: game.name, port, process: gameProcess });

        // Wait for game server to be ready
        await this.waitForServer(port);

        this.gamesWithUrls.push({
          ...game,
          url: `http://localhost:${port}`,
        });

        console.log(`Started ${game.name} on port ${port}`);
      } catch (error) {
        console.error(`Failed to start ${game.name}:`, error);
      }
    }

    return this.gamesWithUrls;
  }

  getGamesWithUrls(): GameWithUrl[] {
    return this.gamesWithUrls;
  }

  async stopAllGames(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    for (const [name, game] of this.runningGames) {
      stopPromises.push(
        new Promise((resolve) => {
          treeKill(game.process.pid!, 'SIGTERM', (err) => {
            if (err) {
              console.error(`Error killing ${name}:`, err);
            }
            this.portManager.release(game.port);
            resolve();
          });
        })
      );
    }
    await Promise.all(stopPromises);
    this.runningGames.clear();
    this.gamesWithUrls = [];
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
