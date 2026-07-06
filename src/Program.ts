import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MapleClaudeGame } from './MapleClaudeGame.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_WZ_DIR = path.resolve(__dirname, '..', 'wz_client');

async function main(): Promise<void> {
  const game = new MapleClaudeGame();

  const envHost = process.env.MAPLECLAUDE_LOGIN_HOST;
  const envPort = process.env.MAPLECLAUDE_LOGIN_PORT;
  const envWzDir = process.env.MAPLECLAUDE_WZ_DIR ?? process.env.MAPLECLAUDE_NX_DIR;

  if (envHost) game.loginHost = envHost;
  if (envPort) game.loginPort = parseInt(envPort, 10);
  game.wzDir = envWzDir ?? DEFAULT_WZ_DIR;

  console.log(`MapleClaude TS starting — login ${game.loginHost}:${game.loginPort}`);
  if (game.wzDir) console.log(`WZ dir: ${game.wzDir}`);

  await game.init('game-canvas');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
