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
  if (msg.method === 'Runtime.consoleAPICalled') {
    const args = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ');
    logs.push(`[${msg.params.type}] ${args}`);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push(`[exception] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description ?? ''}`);
  }
});

async function click(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 0 });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
}

async function typeText(text) {
  for (const ch of text) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, key: ch });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch, unmodifiedText: ch, key: ch });
  }
}

async function getStage() {
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({stage: window.__game?.stageDirector?.current?.constructor?.name, label: window.__game?.stageDirector?.current?._statusLabel?.text})`,
    returnByValue: true,
  });
  try { return JSON.parse(r.result.value); } catch { return null; }
}

ws.on('open', async () => {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });

  await send('Page.navigate', { url: 'http://localhost:3001/?wzDir=/wz_client&wsProxy=ws://127.0.0.1:8600' });
  await new Promise(r => setTimeout(r, 2000));

  // poll for LoginStage, clicking splash to advance
  let stage = null;
  for (let i = 0; i < 30; i++) {
    stage = await getStage();
    if (stage?.stage === 'LoginStage') break;
    await click(796, 387);
    await new Promise(r => setTimeout(r, 500));
  }
  logs.push(`[harness] stage after splash-skip: ${JSON.stringify(stage)}`);

  await new Promise(r => setTimeout(r, 1000));

  // click ID field, type username
  await click(286, 271);
  await new Promise(r => setTimeout(r, 200));
  await typeText('testuser');

  // click password field, type password
  await click(286, 296);
  await new Promise(r => setTimeout(r, 200));
  await typeText('testpass1');

  // click login button
  await click(452, 270);

  // wait up to 6s for WorldSelectStage
  for (let i = 0; i < 12; i++) {
    stage = await getStage();
    if (stage?.stage !== 'LoginStage') break;
    await new Promise(r => setTimeout(r, 500));
  }
  logs.push(`[harness] after login: ${JSON.stringify(stage)}`);
  if (stage?.stage !== 'WorldSelectStage') {
    console.log(logs.join('\n'));
    ws.close(); process.exit(0);
  }

  // click to select world (WorldSelectStage sends SelectWorld on any click)
  await new Promise(r => setTimeout(r, 500));
  await click(400, 300);

  // wait for CharSelectStage
  for (let i = 0; i < 12; i++) {
    stage = await getStage();
    if (stage?.stage !== 'WorldSelectStage') break;
    await new Promise(r => setTimeout(r, 500));
  }
  logs.push(`[harness] after world select: ${JSON.stringify(stage)}`);
  if (stage?.stage !== 'CharSelectStage') {
    console.log(logs.join('\n'));
    ws.close(); process.exit(0);
  }

  await new Promise(r => setTimeout(r, 500));

  // click to select first character (or create if empty)
  await click(400, 300);

  // wait for GameStage or SelectCharacterResult
  for (let i = 0; i < 20; i++) {
    stage = await getStage();
    if (stage?.stage !== 'CharSelectStage') break;
    await new Promise(r => setTimeout(r, 500));
  }
  logs.push(`[harness] after char select: ${JSON.stringify(stage)}`);

  // give a bit more time for migration logs
  await new Promise(r => setTimeout(r, 2000));
  stage = await getStage();
  logs.push(`[harness] final: ${JSON.stringify(stage)}`);

  console.log(logs.join('\n'));
  ws.close();
  process.exit(0);
  ws.close();
  process.exit(0);
});
