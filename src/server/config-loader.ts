import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface CabinetConfig {
  cabinetName: string;
  cabinetPort: number;
  gamesDirectory: string;
  portRange: {
    start: number;
    end: number;
  };
  escapeSequence: {
    key: string;
    holdDuration: number;
    rapidPressCount: number;
  };
}

const defaultConfig: CabinetConfig = {
  cabinetName: 'CAB',
  cabinetPort: 3000,
  gamesDirectory: './games',
  portRange: { start: 3001, end: 3099 },
  escapeSequence: { key: 'Escape', holdDuration: 1500, rapidPressCount: 3 },
};

export function loadConfig(configPath?: string): CabinetConfig {
  const path = configPath || resolve(process.cwd(), 'cabinet.config.json');

  if (!existsSync(path)) {
    console.log('No cabinet.config.json found, using defaults');
    return defaultConfig;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...defaultConfig, ...userConfig };
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
  }
}
