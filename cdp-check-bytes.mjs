import WebSocket from 'ws';

const wsUrl = process.argv[2];
const ws = new WebSocket(wsUrl);
let id = 1;
const pending = new Map();

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
});

ws.on('open', async () => {
  await send('Runtime.enable');

  const expr = `
    (async () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/wz_client/UI.wz', false);
      xhr.overrideMimeType('text/plain; charset=x-user-defined');
      xhr.send();
      const text = xhr.responseText;
      const bytes = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
      const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
      const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2,'0')).join('');
      return JSON.stringify({ status: xhr.status, textLength: text.length, byteLength: bytes.length, first16: Array.from(bytes.slice(0,16)), sha256: hashHex });
    })()
  `;

  const result = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  console.log(JSON.stringify(result, null, 2));
  ws.close();
  process.exit(0);
});
