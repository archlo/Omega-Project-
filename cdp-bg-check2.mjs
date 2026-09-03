import WebSocket from 'ws';
import fs from 'fs';

const targets = await (await fetch('http://localhost:9333/json')).json();
const page = targets.find(t => t.type === 'page' && t.url.includes('localhost:3000'));
if (!page) { console.log('no page target'); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
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
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleMsgs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception));
  }
});

ws.on('open', async () => {
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:3000/' });
    await new Promise(r => setTimeout(r, 3000));

    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 400, y: 300, button: 'left', clickCount: 1 }, 60000);
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 400, y: 300, button: 'left', clickCount: 1 }, 60000);

    // Wait for Map.wz chunked load
    await new Promise(r => setTimeout(r, 230000));

    const shot = await send('Page.captureScreenshot', { format: 'png' }, 60000);
    fs.writeFileSync('/tmp/login-bg2.png', Buffer.from(shot.data, 'base64'));

    console.log('CONSOLE LOG:');
    console.log(consoleMsgs.filter(m => m.includes('LoginStage') || m.includes('Map') || m.includes('EXCEPTION')).join('\n'));
    console.log('Screenshot saved');
  } catch (e) {
    console.log('ERROR:', e.message);
  } finally {
    ws.close();
    process.exit(0);
  }
});
