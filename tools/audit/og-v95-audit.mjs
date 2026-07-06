import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dumpRoot = path.join(root, '.audit', 'og_v95');
const generated = path.join(dumpRoot, 'generated');
const srcRoot = path.join(root, 'src');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function readAbs(file) {
  return fs.readFileSync(file, 'utf8');
}

function tryJson(file) {
  return JSON.parse(readAbs(file));
}

function walk(dir, pred = () => true) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function extractEnum(source, name) {
  const m = source.match(new RegExp(`export\\s+enum\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) return new Map();
  const entries = new Map();
  let next = 0;
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;
    const mm = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=\s*([^,]+))?,?/);
    if (!mm) continue;
    let value = next;
    if (mm[2] != null) {
      const expr = mm[2].trim();
      if (/^0x/i.test(expr)) value = Number.parseInt(expr, 16);
      else value = Number.parseInt(expr, 10);
    }
    entries.set(mm[1], value);
    next = value + 1;
  }
  return entries;
}

function invertEnum(map) {
  const out = new Map();
  for (const [name, value] of map) out.set(value, name);
  return out;
}

function findLine(fileText, needle) {
  const lines = fileText.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.includes(needle));
  return idx >= 0 ? idx + 1 : null;
}

function table(rows, headers) {
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((h) => esc(row[h])).join(' | ')} |`),
  ].join('\n');
}

function countRegex(source, re) {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  return [...source.matchAll(new RegExp(re.source, flags))].length;
}

function loadTsSurface() {
  const opCodesText = read('src/net/packet/OpCodes.ts');
  const enumText = read('src/net/protocol/Enums.ts');
  const handlerFiles = walk(path.join(srcRoot, 'net', 'handlers'), (p) => p.endsWith('.ts'));
  const senderFiles = walk(path.join(srcRoot, 'net', 'senders'), (p) => p.endsWith('.ts'));
  const uiFiles = walk(path.join(srcRoot, 'ui', 'game'), (p) => p.endsWith('.ts'));
  const stageFiles = walk(path.join(srcRoot, 'stages'), (p) => p.endsWith('.ts'));
  const characterFiles = walk(path.join(srcRoot, 'character'), (p) => p.endsWith('.ts'));
  const mapFiles = walk(path.join(srcRoot, 'map'), (p) => p.endsWith('.ts'));
  const renderFiles = walk(path.join(srcRoot, 'render'), (p) => p.endsWith('.ts'));
  const wzFiles = walk(path.join(srcRoot, 'wz'), (p) => p.endsWith('.ts'));

  const allRead = [...handlerFiles, ...senderFiles, ...uiFiles, ...stageFiles, ...characterFiles, ...mapFiles, ...renderFiles, ...wzFiles]
    .map((file) => [file, readAbs(file)]);

  const registeredOut = new Map();
  for (const [file, text] of allRead) {
    for (const m of text.matchAll(/router\.register\(OutHeader\.([A-Za-z0-9_]+)/g)) {
      const line = findLine(text, `router.register(OutHeader.${m[1]}`);
      if (!registeredOut.has(m[1])) registeredOut.set(m[1], []);
      registeredOut.get(m[1]).push(`${rel(file)}:${line ?? '?'}`);
    }
  }

  const sentIn = new Map();
  for (const [file, text] of allRead) {
    for (const m of text.matchAll(/OutPacket\.Of\(InHeader\.([A-Za-z0-9_]+)/g)) {
      const line = findLine(text, `OutPacket.Of(InHeader.${m[1]}`);
      if (!sentIn.has(m[1])) sentIn.set(m[1], []);
      sentIn.get(m[1]).push(`${rel(file)}:${line ?? '?'}`);
    }
  }

  const uiRows = [];
  for (const file of uiFiles) {
    const text = readAbs(file);
    const className = text.match(/export\s+class\s+([A-Za-z0-9_]+)/)?.[1] ?? path.basename(file, '.ts');
    const imported = allRead.some(([other, otherText]) => other !== file && otherText.includes(`/${className}.js'`) || otherText.includes(`/${className}.js"`));
    const hasDraw = /\bdraw\s*\(/.test(text);
    const hasUpdate = /\bupdate\s*\(/.test(text);
    const hasMouse = /\b(handleMouseButton|onMouseButton|onMouseMove|handleMouseMove)\s*\(/.test(text);
    const callbacks = countRegex(text, /\b(On[A-Z][A-Za-z0-9_]*|on[A-Z][A-Za-z0-9_]*)\s*[:=]/g);
    uiRows.push({
      File: rel(file),
      Class: className,
      Imported: imported ? 'yes' : 'no',
      Render: hasDraw || hasUpdate ? 'yes' : 'no',
      Input: hasMouse ? 'yes' : 'no',
      Callbacks: callbacks,
    });
  }

  return {
    opCodesText,
    enumText,
    inHeader: extractEnum(opCodesText, 'InHeader'),
    outHeader: extractEnum(opCodesText, 'OutHeader'),
    protocolEnums: enumText,
    handlerFiles,
    senderFiles,
    uiFiles,
    allRead,
    registeredOut,
    sentIn,
    uiRows,
  };
}

function enumByName(enums, name) {
  return enums.enums.find((e) => e.name === name);
}

function packetRows(packetHandlers, outByValue, registeredOut) {
  const rows = [];
  const keys = Object.keys(packetHandlers).map(Number).sort((a, b) => a - b);
  for (const opcode of keys) {
    const handlers = packetHandlers[String(opcode)] ?? [];
    const important = handlers.some((h) => /CLogin|CWvsContext|CField|CUser|CMob|CNpc|Drop|Script|Shop|Trunk|Cash|ITC|MapleTV|Reactor|Summoned|TownPortal|AffectedArea|Employee|MiniRoom|Trading|Personal/.test(`${h.class} ${h.func}`));
    if (!important && !outByValue.has(opcode)) continue;
    const tsName = outByValue.get(opcode);
    rows.push({
      Opcode: opcode,
      TS: tsName ?? 'MISSING',
      Registered: tsName ? (registeredOut.has(tsName) ? registeredOut.get(tsName).join('<br>') : 'no') : 'n/a',
      OG: [...new Set(handlers.map((h) => `${h.class}.${h.func}`))].slice(0, 4).join('<br>'),
    });
  }
  return rows;
}

function handlerRiskRows(handlerFiles) {
  return handlerFiles.map((file) => {
    const text = readAbs(file);
    return {
      File: rel(file),
      Registers: countRegex(text, /router\.register\(/g),
      Skips: countRegex(text, /\.skip\(/g),
      TryCatch: countRegex(text, /\btry\s*\{/g),
      Opaque: countRegex(text, /opaque|not reconstructed|not yet|TODO|unknown|discarded|guess/i),
      Console: countRegex(text, /console\./g),
    };
  }).sort((a, b) => (b.Skips + b.TryCatch + b.Opaque + b.Console) - (a.Skips + a.TryCatch + a.Opaque + a.Console));
}

function senderRiskRows(senderFiles) {
  return senderFiles.map((file) => {
    const text = readAbs(file);
    return {
      File: rel(file),
      Methods: countRegex(text, /\bstatic\s+[A-Za-z0-9_]+\s*\(/g),
      Packets: countRegex(text, /OutPacket\.Of\(InHeader\./g),
      MagicBytes: countRegex(text, /writeByte\((?:0x[0-9a-f]+|\d+)\)/gi),
      SkipsOrZeros: countRegex(text, /write(?:Int|Short|Byte)\(0\)/g),
      Comments: countRegex(text, /TODO|guess|placeholder|server-decoder|unknown/i),
    };
  });
}

function logOnlyRows(stageFiles) {
  const rows = [];
  for (const file of stageFiles) {
    const text = readAbs(file);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/On[A-Z][A-Za-z0-9_]*\s*=\s*\(.*console\.log|on[A-Z][A-Za-z0-9_]*\s*=\s*\(.*console\.log|console\.log\(/.test(line)) {
        rows.push({ File: `${rel(file)}:${index + 1}`, Code: line.trim().slice(0, 140) });
      }
    });
  }
  return rows;
}

function sourceMatchRows(tsFiles, ogClasses) {
  const rows = [];
  for (const file of tsFiles) {
    const name = path.basename(file, '.ts');
    const candidates = [
      `C${name}`,
      `CUI${name}`,
      `C${name}Dlg`,
      `CUI${name}Dlg`,
      name,
    ];
    const matches = candidates.filter((c) => ogClasses.has(c));
    rows.push({
      File: rel(file),
      TS: name,
      OG: matches.length ? matches.join(', ') : 'no direct class name match',
    });
  }
  return rows;
}

function main() {
  if (!fs.existsSync(generated)) {
    throw new Error(`OG generated directory not found: ${generated}`);
  }

  const ts = loadTsSurface();
  const packetHandlers = tryJson(path.join(generated, 'packet_handlers.json'));
  const enums = tryJson(path.join(generated, 'enums.json'));
  const master = tryJson(path.join(generated, 'master_report.json'));
  const hierarchy = tryJson(path.join(generated, 'hierarchy_complete.json'));

  const outByValue = invertEnum(ts.outHeader);
  const inByValue = invertEnum(ts.inHeader);
  const cwvs = enumByName(enums, 'ENUM_CWvsContext_nType');
  const login = enumByName(enums, 'ENUM_CLogin_nType');
  const cashShop = enumByName(enums, 'ENUM_CCashShop_nType');
  const miniRoom = enums.enums.find((e) => e.name.includes('MiniRoom')) ?? null;

  const ogClasses = new Set();
  // hierarchy_complete.json is a flat object keyed directly by class name
  // (not nested under a `.classes` property) — this previously read
  // hierarchy.classes, which is always undefined, so the OG class set was
  // silently built only from packet_handlers.json's dispatcher classes and
  // every CUI-prefixed dialog class showed as "no direct class name match".
  for (const key of Object.keys(hierarchy ?? {})) ogClasses.add(key);
  for (const h of Object.values(packetHandlers).flat()) ogClasses.add(h.class);

  const opcode = packetRows(packetHandlers, outByValue, ts.registeredOut);
  const missingTs = opcode.filter((r) => r.TS === 'MISSING').length;
  const unregistered = opcode.filter((r) => r.TS !== 'MISSING' && r.Registered === 'no').length;
  const sentRows = [...ts.inHeader].map(([name, value]) => ({
    InHeader: name,
    Value: value,
    Sender: ts.sentIn.has(name) ? ts.sentIn.get(name).join('<br>') : 'no',
    OGPacketHandlerHit: packetHandlers[String(value)] ? 'server->client collision in packet_handlers.json' : '',
  }));

  const handlerRisk = handlerRiskRows(ts.handlerFiles);
  const senderRisk = senderRiskRows(ts.senderFiles);
  const logOnly = logOnlyRows(walk(path.join(srcRoot, 'stages'), (p) => p.endsWith('.ts')));
  const cashShopRisk = handlerRisk.find((r) => r.File.endsWith('CashShopHandlers.ts'));
  const cashShopRegisters = cashShopRisk?.Registers ?? 0;
  const uiParity = sourceMatchRows(ts.uiFiles, ogClasses).map((row) => ({
    ...row,
    ...(ts.uiRows.find((u) => u.TS === row.TS || u.Class === row.TS) ?? {}),
  }));

  const priority = [
    ['P0', 'Opcode drift', `${missingTs} important OG packet opcodes have no TS OutHeader name; ${unregistered} named TS OutHeaders are not registered.`],
    ['P0', 'CashShop sub-dispatch debt', `OG ${cashShop?.name ?? 'CashShop enum'} has ${cashShop?.case_count ?? '?'} top-level dispatch cases; TS CashShopHandlers registers ${cashShopRegisters}. Remaining debt is CashItemResult sub-actions and opaque cash item / CharacterData record layouts.`],
    ['P0', 'Unsafe decoder debt', `${handlerRisk.reduce((n, r) => n + Number(r.Skips), 0)} skip() sites and ${handlerRisk.reduce((n, r) => n + Number(r.TryCatch), 0)} try blocks in net handlers need OG field-by-field confirmation.`],
    ['P1', 'Log-only UI callbacks', `${logOnly.length} stage log lines/callbacks found; these must be replaced with real senders or marked OG-blocked.`],
    ['P1', 'Sender byte parity', `${senderRisk.reduce((n, r) => n + Number(r.MagicBytes), 0)} literal writeByte(...) sites remain in senders; verify every sub-action byte.`],
    ['P2', 'Visual parity', `${ts.uiRows.length} game UI panels exist; each must be checked for OG open path, close path, input, draw/update, WZ art, and packet wiring.`],
  ].map(([Priority, Area, Finding]) => ({ Priority, Area, Finding }));

  const lines = [];
  lines.push('# Full OG v95 Code Audit');
  lines.push('');
  lines.push(`Generated by \`tools/audit/og-v95-audit.mjs\` from local OG dump at \`.audit/og_v95\`.`);
  lines.push('');
  lines.push('## Scope And Inputs');
  lines.push('');
  lines.push(`- OG dump stats: ${master.stats.total_functions} functions, ${master.stats.total_classes} classes, ${master.stats.total_call_edges} call edges, ${enums.unique_case_sets} switch/enum case sets.`);
  lines.push('- TS audit scope: packet opcodes, protocol enums, handlers, senders, game UI panels, stages, character/map/render/WZ modules.');
  lines.push('- Rule: existing TS code is not trusted just because a file exists; OG dispatch/read/write behavior wins.');
  lines.push('');
  lines.push('## Priority Queue');
  lines.push('');
  lines.push(table(priority, ['Priority', 'Area', 'Finding']));
  lines.push('');
  lines.push('## Opcode Parity');
  lines.push('');
  lines.push('Important OG packet-handler opcodes compared with TS `OutHeader` names and router registrations. `MISSING` means the OG packet appears in the dump but has no TS enum entry yet.');
  lines.push('');
  lines.push(table(opcode.slice(0, 220), ['Opcode', 'TS', 'Registered', 'OG']));
  if (opcode.length > 220) lines.push(`\n_Trimmed to 220 rows from ${opcode.length}; rerun the script or inspect JSON for the full set._`);
  lines.push('');
  lines.push('## Client-To-Server Sender Surface');
  lines.push('');
  lines.push('Every TS `InHeader` and whether a sender currently emits it. Values are TS-side until each is pinned against the OG send/decode site.');
  lines.push('');
  lines.push(table(sentRows, ['InHeader', 'Value', 'Sender', 'OGPacketHandlerHit']));
  lines.push('');
  lines.push('## Handler Decode Parity Risk');
  lines.push('');
  lines.push('Handlers with `skip`, `try`, opaque comments, or console output need source-level read-through against OG decompile bodies.');
  lines.push('');
  lines.push(table(handlerRisk, ['File', 'Registers', 'Skips', 'TryCatch', 'Opaque', 'Console']));
  lines.push('');
  lines.push('## Sender Encode Parity Risk');
  lines.push('');
  lines.push(table(senderRisk, ['File', 'Methods', 'Packets', 'MagicBytes', 'SkipsOrZeros', 'Comments']));
  lines.push('');
  lines.push('## UI Parity');
  lines.push('');
  lines.push('Each TS game panel is listed even when it exists and renders. `OG` is only a direct class-name match and must be followed by function-level audit.');
  lines.push('');
  lines.push(table(uiParity, ['File', 'TS', 'OG', 'Imported', 'Render', 'Input', 'Callbacks']));
  lines.push('');
  lines.push('## Runtime Wiring And Log-Only Callbacks');
  lines.push('');
  lines.push(table(logOnly.slice(0, 120), ['File', 'Code']));
  lines.push('');
  lines.push('## OG Enum Checkpoints');
  lines.push('');
  lines.push(table([
    { Enum: 'ENUM_CWvsContext_nType', Cases: cwvs?.case_count ?? '?', TSUse: 'OutHeader / CWvsContextType' },
    { Enum: 'ENUM_CLogin_nType', Cases: login?.case_count ?? '?', TSUse: 'OutHeader login range' },
    { Enum: 'ENUM_CCashShop_nType', Cases: cashShop?.case_count ?? '?', TSUse: 'CashShopHandlers' },
    { Enum: miniRoom?.name ?? 'MiniRoom enum not auto-selected', Cases: miniRoom?.case_count ?? '?', TSUse: 'MiniRoomProtocol / FieldHandlers.handleMiniRoom' },
  ], ['Enum', 'Cases', 'TSUse']));
  lines.push('');
  lines.push('## Implementation Notes');
  lines.push('');
  lines.push('- Replace guessed comments like `verify exact opcode values` only after reading the matching OG dispatcher and decompile body.');
  lines.push('- For every handler fix, add a byte-budget test that consumes the full packet payload.');
  lines.push('- For every sender fix, add an exact emitted byte-array test.');
  lines.push('- For every UI panel, verify open path, close path, mouse/key input, update/draw, WZ paths, callbacks, and server result handling.');
  lines.push('- Keep TS-only/speculative behavior labeled separately from OG-confirmed behavior.');
  lines.push('');
  lines.push('## Next Concrete Fixes From This Pass');
  lines.push('');
  lines.push('1. Add/repair tests for `OpCodes.ts` using OG packet handler opcodes and enum dispatch ranges.');
  lines.push('2. Continue `CashShopHandlers.ts` at the internal `CashShopCashItemResult` 0x54-0xBC sub-actions and opaque `GW_CashItemInfo` / `CharacterData` layouts; all top-level OG CashShop opcodes are now registered.');
  lines.push('3. Audit `FieldHandlers.ts` skip sites and remove any skip not backed by OG optional/opaque structure proof.');
  lines.push('4. Replace `GameStage` log-only callbacks for Maker, SkillMacro, Claim, EnchantSkill, MiracleCube, GoldHammer, KarmaScissors, ItemProtector, and Repair.');
  lines.push('5. Continue after the completed 328-333 pool fix by rendering OpenGate/TownPortal/AffectedArea visuals, or keep them state-only until the WZ asset paths are audited.');

  fs.writeFileSync(path.join(root, 'AUDIT_OG_V95.md'), `${lines.join('\n')}\n`);
}

main();
