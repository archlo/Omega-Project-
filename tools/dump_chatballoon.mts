import { WzPackage } from '../src/wz/WzPackage.js';
import { WzCanvas } from '../src/wz/WzCanvas.js';
import { WzProperty } from '../src/wz/WzProperty.js';

const dir = 'C:/Users/jorge/OneDrive/Desktop/ts/wz_client';
const pkg = WzPackage.OpenBase(dir, 'UI');

const root = pkg.GetItem('ChatBalloon.img');
console.log('ChatBalloon.img root:', root?.constructor?.name);
if (!root) {
  console.log('NOT FOUND — searching subpaths');
  const cands = ['UIWindow.img/ChatBalloon', 'UIWindow2.img/ChatBalloon', 'ChatBalloon.img/ChatBalloon'];
  for (const c of cands) {
    const n = pkg.GetItem(c);
    if (n) console.log('  FOUND at:', c, n.constructor.name);
  }
  process.exit(0);
}
const rootProp = (root as any)?.Root ?? root;
console.log('rootProp:', rootProp?.constructor?.name);
const children = rootProp instanceof WzProperty ? Object.keys(rootProp.Items) : [];
console.log('children count:', children.length);
console.log('children:', children.slice(0, 80).join(', '));

for (const name of children.slice(0, 4)) {  const node = rootProp.Get(name);
  console.log(`\n== node '${name}' ==`, node?.constructor?.name);
  if (node instanceof WzCanvas) {
    console.log('  canvas WxH:', node.Width, node.Height);
    const props = (node as any).Property;
    if (props) {
      const pk = Object.keys(props.Items ?? {});
      console.log('  canvas props:', pk.join(', '));
      for (const pk2 of pk) console.log('    ', pk2, '=', props.Get(pk2));
    }
  } else if (node instanceof WzProperty) {
    const keys = Object.keys(node.Items);
    console.log('  props:', keys.join(', '));
    for (const k of keys) {
      const v = node.Get(k);
      console.log('    ', k, '=', typeof v === 'number' ? v : v instanceof WzCanvas ? `canvas ${v.Width}x${v.Height}` : v?.constructor?.name);
    }
  }
}

console.log('--- sub nodes ---');
for (const name of ['npc', 'pet', 'mob', 'adboard', 'dead', 'tutorial', 'miniroom', '40']) {
  const node = rootProp.Get(name);
  if (!node) { console.log(`== ${name}: NOT FOUND ==`); continue; }
  console.log(`== ${name} ==`, node.constructor.name);
  if (node instanceof WzProperty) {
    const keys = Object.keys(node.Items);
    console.log('  keys:', keys.join(', '));
    for (const k of keys) {
      const v = node.Get(k);
      if (v instanceof WzCanvas) console.log('    ', k, '= canvas', v.Width, 'x', v.Height);
      else if (typeof v === 'number' || typeof v === 'bigint') console.log('    ', k, '=', v);
      else if (v instanceof WzProperty) console.log('    ', k, '= {', Object.keys(v.Items).join(', '), '}');
      else console.log('    ', k, '=', v?.constructor?.name);
    }
  } else if (node instanceof WzCanvas) {
    console.log('  canvas', node.Width, 'x', node.Height);
  }
}
