import WebSocket from 'ws';
import fs from 'fs';

const wsUrl = process.argv[2];
const ws = new WebSocket(wsUrl);
let id = 1;
const pending = new Map();
const consoleMsgs = [];

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
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
    consoleMsgs.push(text);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleMsgs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception));
  }
});

ws.on('open', async () => {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise(r => setTimeout(r, 2000));

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 512, y: 384, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 512, y: 384, button: 'left', clickCount: 1 });

  // Map.wz is 745MB chunked - wait for it
  await new Promise(r => setTimeout(r, 230000));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/tmp/login-bg.png', Buffer.from(shot.data, 'base64'));

  console.log('CONSOLE LOG:');
  console.log(consoleMsgs.filter(m => m.includes('LoginStage') || m.includes('MapScene') || m.includes('EXCEPTION') || m.includes('Map')).join('\n'));
  console.log('Screenshot saved to /tmp/login-bg.png');

  ws.close();
  process.exit(0);
});
