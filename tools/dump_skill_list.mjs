// Enumerates every skill ID in Skill.wz across all job roots, resolves each
// name via String.wz (Skill.img), and writes a master {id, jobRoot, name}
// list. Run with: MAPLECLAUDE_WZ_DIR=<path> npx tsx tools/dump_skill_list.mjs
import * as fs from 'node:fs';
import { WzPackage } from '../src/wz/WzPackage.js';
import { WzDirectory } from '../src/wz/WzDirectory.js';
import { WzImage } from '../src/wz/WzImage.js';
import { WzProperty } from '../src/wz/WzProperty.js';

// env vars don't cross the WSL->Windows node.exe boundary in this sandbox,
// so accept the wz directory as a CLI arg too.
const wzDir = process.argv[2] || process.env.MAPLECLAUDE_WZ_DIR;
if (!wzDir) {
  console.error('Usage: node dump_skill_list.mjs <wz_client dir>');
  process.exit(1);
}

const skillWz = WzPackage.OpenBase(wzDir, 'Skill', 95);
const stringWz = WzPackage.OpenBase(wzDir, 'String', 95);

// String.wz/Skill.img/<skillId>/name
const skillNameImg = stringWz.GetItem('Skill.img');
const skillNameRoot = skillNameImg instanceof WzImage ? skillNameImg.Root : skillNameImg;
const names = new Map();
if (skillNameRoot instanceof WzProperty) {
  for (const [key, value] of Object.entries(skillNameRoot.Items)) {
    const id = parseInt(key, 10);
    if (Number.isNaN(id)) continue;
    if (value instanceof WzProperty) {
      const nameNode = value.Get('name');
      if (typeof nameNode === 'string') names.set(id, nameNode);
    }
  }
}

// Top-level entries of Skill.wz are job-root images named "<job>.img".
const root = skillWz.Root ?? skillWz;
const jobRoots = [];
const items = root instanceof WzDirectory ? root.Items : {};
for (const key of Object.keys(items)) {
  const m = key.match(/^(\d+)\.img$/);
  if (m) jobRoots.push(parseInt(m[1], 10));
}
jobRoots.sort((a, b) => a - b);

const out = [];
for (const job of jobRoots) {
  const img = skillWz.GetItem(`${job}.img`);
  if (!(img instanceof WzImage)) continue;
  const skillNode = img.Root.Get('skill');
  if (!(skillNode instanceof WzProperty)) continue;
  for (const [key, value] of Object.entries(skillNode.Items)) {
    const id = parseInt(key, 10);
    if (Number.isNaN(id)) continue;
    const invisible = value instanceof WzProperty && Number(value.Get('invisible') ?? 0) !== 0;
    const action = value instanceof WzProperty ? value.Get('action') : null;
    const actionNames = action instanceof WzProperty ? Object.values(action.Items).filter((v) => typeof v === 'string') : [];
    out.push({
      id,
      jobRoot: job,
      name: names.get(id) ?? null,
      invisible,
      hasEffect: value instanceof WzProperty && value.Get('effect') != null,
      hasEffect0: value instanceof WzProperty && value.Get('effect0') != null,
      hasScreen: value instanceof WzProperty && value.Get('screen') != null,
      hasHit: value instanceof WzProperty && value.Get('hit') != null,
      actions: actionNames,
    });
  }
}
out.sort((a, b) => a.id - b.id);

fs.writeFileSync('tools/_skill_master_list.json', JSON.stringify(out, null, 2));
console.log(`wrote ${out.length} skills across ${jobRoots.length} job roots to tools/_skill_master_list.json`);
console.log('job roots:', jobRoots.join(', '));
