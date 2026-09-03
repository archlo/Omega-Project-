import WebSocket from 'ws';
import fs from 'fs';

const wsUrl = process.argv[2];
const out = process.argv[3] || '/tmp/shot.png';
const ws = new WebSocket(wsUrl);
let id = 1;
const pending = new Map();
const consoleMsgs = [];

function send(method, params = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const msgId = id++;
    const timer = setTimeout(() => { pending.delete(msgId); reject(new Error('timeout ' + method)); }, timeoutMs);
    pending.set(msgId, (result) => { clearTimeout(timer); resolve(result); });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
    consoleMsgs.push(text);
  }
});

ws.on('open', async () => {
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    const shot = await send('Page.captureScreenshot', { format: 'png' }, 20000);
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('saved', out);
    console.log('CONSOLE:', consoleMsgs.slice(-20).join('\n'));
  } catch (e) {
    console.log('ERROR:', e.message);
  } finally {
    ws.close();
    process.exit(0);
  }
});
