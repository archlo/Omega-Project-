import * as net from 'node:net';
import { WebSocketServer, WebSocket } from 'ws';

const WS_PORT = parseInt(process.env.WS_PROXY_PORT || '8485', 10);
const TCP_HOST = process.env.WS_PROXY_TARGET_HOST || '127.0.0.1';
const TCP_PORT = parseInt(process.env.WS_PROXY_TARGET_PORT || '8484', 10);

function relay(ws: WebSocket, tcp: net.Socket): void {
  ws.on('message', (data: ArrayBuffer | Buffer) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    tcp.write(buf);
  });
  ws.on('close', () => tcp.destroy());
  ws.on('error', () => tcp.destroy());

  tcp.on('data', (data: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
  tcp.on('close', () => ws.close());
  tcp.on('error', () => ws.close());
}

const wss = new WebSocketServer({ port: WS_PORT });
wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const host = url.searchParams.get('host') || TCP_HOST;
  const port = parseInt(url.searchParams.get('port') || '', 10) || TCP_PORT;

  const tcp = new net.Socket();
  tcp.connect(port, host, () => {
    relay(ws, tcp);
  });
  tcp.on('error', (err) => {
    ws.close(1011, `TCP error: ${err.message}`);
  });
});

console.log(`WS proxy :${WS_PORT} → tcp://${TCP_HOST}:${TCP_PORT}`);
console.log('Set WS_PROXY_PORT / WS_PROXY_TARGET_HOST / WS_PROXY_TARGET_PORT to override.');
