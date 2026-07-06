import WebSocket from 'ws';

const wsUrl = process.argv[2];
const ws = new WebSocket(wsUrl);
let id = 1;

function send(method, params = {}) {
  const msgId = id++;
  ws.send(JSON.stringify({ id: msgId, method, params }));
}

ws.on('open', () => {
  send('Runtime.enable');
  send('Log.enable');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
    console.log(`[${msg.params.type}] ${text}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    console.log(`[exception] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`);
  }
});
