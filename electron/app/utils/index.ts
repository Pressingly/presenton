import net from 'net'
import treeKill from 'tree-kill'
import fs from 'fs'
import { localhost, tempDir, userConfigPath } from './constants'

export function setUserConfig(userConfig: UserConfig) {
  let existingConfig: UserConfig = {}

  if (fs.existsSync(userConfigPath)) {
    const configData = fs.readFileSync(userConfigPath, 'utf-8')
    existingConfig = JSON.parse(configData)
  }
  const definedIncomingEntries = Object.entries(userConfig).filter(([, value]) => value !== undefined)
  const mergedConfig: UserConfig = {
    ...existingConfig,
    ...Object.fromEntries(definedIncomingEntries),
    CODEX_ACCESS_TOKEN: existingConfig.CODEX_ACCESS_TOKEN,
    CODEX_REFRESH_TOKEN: existingConfig.CODEX_REFRESH_TOKEN,
    CODEX_TOKEN_EXPIRES: existingConfig.CODEX_TOKEN_EXPIRES,
    CODEX_ACCOUNT_ID: existingConfig.CODEX_ACCOUNT_ID,
  }
  fs.writeFileSync(userConfigPath, JSON.stringify(mergedConfig))
}

export function getUserConfig(): UserConfig {
  if (!fs.existsSync(userConfigPath)) {
    return {}
  }
  const configData = fs.readFileSync(userConfigPath, 'utf-8')
  return JSON.parse(configData)
}

export function setupEnv(fastApiPort: number, nextjsPort: number) {
  const { app } = require('electron');
  process.env.APP_VERSION = app.getVersion();
  process.env.SENTRY_RELEASE = process.env.SENTRY_RELEASE || `presenton-electron@${process.env.APP_VERSION}`;
  process.env.SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || (app.isPackaged ? 'production' : 'development');
  process.env.NEXT_PUBLIC_FAST_API = `${localhost}:${fastApiPort}`;
  process.env.FASTAPI_PUBLIC_URL = process.env.NEXT_PUBLIC_FAST_API;
  process.env.TEMP_DIRECTORY = tempDir;
  process.env.NEXT_PUBLIC_USER_CONFIG_PATH = userConfigPath;
  process.env.NEXT_PUBLIC_URL = `${localhost}:${nextjsPort}`;
  
  // Set environment variables for NextJS API routes
  process.env.USER_CONFIG_PATH = userConfigPath;
  // Read CAN_CHANGE_KEYS from existing env or default to true
  if (process.env.CAN_CHANGE_KEYS === undefined) {
    process.env.CAN_CHANGE_KEYS = "true";
  }
}


export function killProcess(pid: number, signal: NodeJS.Signals = "SIGTERM", timeoutMs: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    treeKill(pid, signal, (err: any) => {
      if (err) {
        console.warn(`SIGTERM failed for PID ${pid}, sending SIGKILL`);
        treeKill(pid, "SIGKILL", () => resolve());
        return;
      }
      // Poll to confirm process is dead
      const start = Date.now();
      const check = setInterval(() => {
        try {
          process.kill(pid, 0); // throws if process doesn't exist
          if (Date.now() - start > timeoutMs) {
            clearInterval(check);
            console.warn(`PID ${pid} still alive after ${timeoutMs}ms, sending SIGKILL`);
            treeKill(pid, "SIGKILL", () => resolve());
          }
        } catch {
          clearInterval(check);
          console.log(`PID ${pid} confirmed dead`);
          resolve();
        }
      }, 100);
    });
  });
}

export async function findUnusedPorts(startPort: number = 40000, count: number = 2): Promise<number[]> {
  const ports: number[] = [];
  console.log(`Finding ${count} unused ports starting from ${startPort}`);

  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  };

  let currentPort = startPort;
  while (ports.length < count) {
    if (await isPortAvailable(currentPort)) {
      ports.push(currentPort);
    }
    currentPort++;
  }

  return ports;
}


export function sanitizeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '_');
}