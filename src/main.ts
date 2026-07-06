import { MapleClaudeGame } from './MapleClaudeGame.js';

async function main(): Promise<void> {
  const game = new MapleClaudeGame();
  const params = new URLSearchParams(globalThis.location?.search ?? '');

  const host = params.get('host') || '127.0.0.1';
  const port = parseInt(params.get('port') || '8484', 10);
  game.loginHost = host;
  game.loginPort = port;
  game.wzDir = params.get('wzDir') || '/wz_client';
  game.session.proxyBase = params.get('wsProxy') || 'ws://127.0.0.1:8580';

  console.log(`MapleClaude TS (browser) — login ${host}:${port} via proxy ${game.session.proxyBase}`);
  (globalThis as unknown as { __game: MapleClaudeGame }).__game = game;
  await game.init('game-canvas');
}

main().catch((err) => {
  console.error('Fatal error:', err);
});
