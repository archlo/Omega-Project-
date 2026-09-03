import WebSocket from 'ws';

const wsUrl = process.argv[2];
const ws = new WebSocket(wsUrl);
let id = 1;
const pending = new Map();
const logs = [];

function send(method, params = {}) {
  return new Promise((resolve) => {
    const msgId = id++;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
  }
  if (msg.method === 'Console.messageAdded') {
    const m = msg.params.message;
    logs.push(`[${m.level}] ${m.text}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = msg.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    logs.push(`[${msg.params.type}] ${args}`);
  }
});

ws.on('open', async () => {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  await send('Page.navigate', { url: 'http://localhost:3001/?wzDir=/wz_client' });
  await new Promise(r => setTimeout(r, 2000));

  // click center to dismiss "Click to continue"
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 640, y: 400, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 640, y: 400, button: 'left', clickCount: 1 });

  await new Promise(r => setTimeout(r, 3000));

  console.log(logs.filter(l => l.includes('DEBUG') || l.includes('LoginStage')).join('\n'));
  ws.close();
  process.exit(0);
});
