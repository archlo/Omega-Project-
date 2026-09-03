// Check what the game's WZ reader sees at runtime
import { WzPackage } from './src/wz/WzPackage.js';

const wzDir = 'wz_client';
const ui = await WzPackage.OpenBaseAsync(wzDir, 'UI', 95);
if (!ui) { console.log('Failed'); process.exit(1); }

const root = ui.Root;
if (!root || !root.Items) { console.log('No root items'); process.exit(1); }

const keys = Object.keys(root.Items);
console.log(`UI.nx root: ${keys.length} entries`);
for (const k of keys.slice(0, 10)) {
  const v = root.Items[k];
  console.log(`  "${k}": ${v.constructor.name}`);
  // If it's a directory, show its children
  if (v.Items) {
    const subKeys = Object.keys(v.Items);
    console.log(`    children: ${subKeys.slice(0, 5).join(', ')}${subKeys.length > 5 ? '...' : ''}`);
  }
}
