const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUTPUT_DIR = __dirname;

// Key CMob methods to decompile — prioritized by implementation importance
const METHODS = [
  // Core lifecycle
  { name: 'CMob_ctor', addr: '0x64ca30' },
  { name: 'CMob_dtor', addr: '0x64d050' },
  { name: 'Init', addr: '0x64d3b0' },
  { name: 'Update', addr: '0x654300' },
  
  // Combat
  { name: 'OnDamaged', addr: '0x64ecb0' },
  { name: 'OnHit', addr: '0x653100' },
  { name: 'OnDie', addr: '0x64e4b0' },
  { name: 'ShowDamage', addr: '0x63c950' },
  { name: 'ProcessAttack', addr: '0x652950' },
  { name: 'DoAttack', addr: '0x6504d0' },
  { name: 'AddDamageInfo', addr: '0x653a10' },
  { name: 'ShowHitEffect', addr: '0x64b140' },
  
  // Movement
  { name: 'OnMove', addr: '0x6521e0' },
  { name: 'GenerateMovePath', addr: '0x651100' },
  { name: 'ApplyControl', addr: '0x640d20' },
  { name: 'ChaseTarget', addr: '0x642db0' },
  { name: 'SetMoveAction', addr: '0x64ec40' },
  { name: 'OnResolveMoveAction', addr: '0x63caf0' },
  { name: 'MoveAction2RawAction', addr: '0x63a9c0' },
  { name: 'RawAction2MoveAction', addr: '0x63aa70' },
  
  // Action/Animation
  { name: 'GetCurrentAction', addr: '0x649ea0' },
  { name: 'GetFineAction', addr: '0x649270' },
  { name: 'GetFineMoveDirAction', addr: '0x6493d0' },
  { name: 'LoadMobAction', addr: '0x63b6b0' },
  { name: 'PrepareActionLayer', addr: '0x64a030' },
  { name: 'ClearActionLayer', addr: '0x63e940' },
  { name: 'ProcessAction', addr: '0x64ab60' },
  { name: 'SetFrameInfo', addr: '0x642560' },
  
  // Stats/Effects
  { name: 'SetTemporaryStat', addr: '0x64afd0' },
  { name: 'ProcessStatSet', addr: '0x64bdd0' },
  { name: 'ProcessStatReset', addr: '0x650030' },
  { name: 'OnAffected', addr: '0x644400' },
  { name: 'ShowAffectedSkill', addr: '0x64ef30' },
  { name: 'UpdateAffectedSkillList', addr: '0x64a500' },
  { name: 'SetAffectedLayerPos', addr: '0x63eaf0' },
  { name: 'ShiftAffectedSkillAnimation', addr: '0x648640' },
  { name: 'OnSpecialEffectBySkill', addr: '0x6540b0' },
  
  // HP/Anger indicators
  { name: 'CreateHPIndicator', addr: '0x643160' },
  { name: 'ShowHPIndicator', addr: '0x63e200' },
  { name: 'HideHPIndicator', addr: '0x63e530' },
  { name: 'AdjustHPIndicatorPosition', addr: '0x642f80' },
  { name: 'CreateAngerIndicator', addr: '0x63cd70' },
  { name: 'ChangeAngerIndicator', addr: '0x63a100' },
  { name: 'AnimateAngerIndicator', addr: '0x63d060' },
  { name: 'InitAngerGaugeData', addr: '0x648b00' },
  { name: 'AngerGaugeFullChargeEffect', addr: '0x6490b0' },
  
  // Packet handlers
  { name: 'OnCtrlAck', addr: '0x640c50' },
  { name: 'OnCatchEffect', addr: '0x63cd00' },
  { name: 'OnEffectByItem', addr: '0x63cd40' },
  { name: 'OnIncMobChargeCount', addr: '0x63d500' },
  { name: 'OnMobSkillDelay', addr: '0x63d560' },
  { name: 'OnMobSpeaking', addr: '0x650000' },
  { name: 'OnMobAttackedByMob', addr: '0x6436a0' },
  { name: 'OnEscortFullPath', addr: '0x643d90' },
  { name: 'OnEscortReturnBefore', addr: '0x649410' },
  { name: 'OnEscortStopSay', addr: '0x64c500' },
  { name: 'OnHPIndicator', addr: '0x642ef0' },
  { name: 'OnNextAttack', addr: '0x6528a0' },
  { name: 'OnStatSet', addr: '0x652660' },
  { name: 'OnStatReset', addr: '0x652780' },
  { name: 'OnSuspendReset', addr: '0x64acb0' },
  
  // Body/collision
  { name: 'GetBodyRect', addr: '0x642140' },
  { name: 'GetAttackBodyRect', addr: '0x6443c0' },
  { name: 'GetMultiBodyRect', addr: '0x6443e0' },
  { name: 'GetArrayBodyRectImpl', addr: '0x642400' },
  { name: 'GetHitPoint', addr: '0x642260' },
  { name: 'GetHitPointHeightRand', addr: '0x642310' },
  { name: 'IsRectIntersectWithTrapezoid', addr: '0x63b390' },
  { name: 'IsTargetInAttackRange', addr: '0x645f50' },
  { name: 'SetLayerZ', addr: '0x63ab50' },
  { name: 'OnLayerZChanged', addr: '0x63b470' },
  
  // State queries
  { name: 'IsActive', addr: '0x63ab30' },
  { name: 'SetActive', addr: '0x640950' },
  { name: 'SetSuspended', addr: '0x640910' },
  { name: 'IsSuspended', addr: '0x63c5d0' },
  { name: 'IsLeft', addr: '0x63c610' },
  { name: 'IsBossMob', addr: '0x439350' },
  { name: 'IsNoFlip', addr: '0x63a6b0' },
  { name: 'IsImmovable', addr: '0x63c640' },
  { name: 'IsNotEnemyMob', addr: '0x639fb0' },
  { name: 'IsMobOurTeam', addr: '0x63b4a0' },
  { name: 'IsSamePhaseWithMe', addr: '0x63b510' },
  { name: 'IsDazzledMobByMe', addr: '0x63b570' },
  { name: 'IsChaseTargetEscort', addr: '0x63b7b0' },
  { name: 'IsChaseTargetDazzle', addr: '0x63b830' },
  { name: 'IsAbleTargetEscortMob', addr: '0x63b8a0' },
  { name: 'IsOnPlayingOneTimeAction', addr: '0x63e1d0' },
  { name: 'IsRisingByToss', addr: '0x63a980' },
  { name: 'IsPosFixed', addr: '0x63a6e0' },
  { name: 'GetMoveAbility', addr: '0x63a690' },
  { name: 'GetPushedDamage', addr: '0x63b5c0' },
  
  // Misc
  { name: 'GetMobID', addr: '0x63c5b0' },
  { name: 'GetTemplate', addr: '0x639f30' },
  { name: 'GetCurTemplate', addr: '0x639f40' },
  { name: 'GetMobStat', addr: '0x639f60' },
  { name: 'GetVecCtrl', addr: '0x63c680' },
  { name: 'GetActiveVecCtrl', addr: '0x63c6b0' },
  { name: 'GetHalfWidth', addr: '0x63e790' },
  { name: 'GetHeight', addr: '0x63c810' },
  { name: 'GetFoothold', addr: '0x93a1a0' },
  { name: 'GetOneTimeAction', addr: '0x63c5f0' },
  { name: 'GetOneTimeActionRemain', addr: '0x63e6d0' },
  { name: 'GetRandomHitAction', addr: '0x639f70' },
  { name: 'GetRemainDamageInfoDelay', addr: '0x63e730' },
  { name: 'GetCalcDamageStatIndex', addr: '0x748d80' },
  { name: 'GetCurrentFrameIndex', addr: '0x749c60' },
  { name: 'CalcCrc', addr: '0x63b5a0' },
  { name: 'GetCrc', addr: '0x63d530' },
  
  // Bullets
  { name: 'SetBallDestPoint', addr: '0x63a130' },
  { name: 'SetMultiBallTarget', addr: '0x6438a0' },
  { name: 'IsMultiBallAttack', addr: '0x641100' },
  { name: 'GetAttackInfo', addr: '0x641330' },
  
  // Escort
  { name: 'SendCollisionEscort', addr: '0x641150' },
  { name: 'SendRequestEscortPath', addr: '0x6411f0' },
  { name: 'SendEscortStopEndRequest', addr: '0x641290' },
  { name: 'ClearEscortInfo', addr: '0x63b980' },
  { name: 'OnEscortStopEndPermmision', addr: '0x63b9c0' },
  { name: 'UpdateEscortStopActRepeat', addr: '0x64c730' },
  
  // Other
  { name: 'TrySpeaking', addr: '0x64b6d0' },
  { name: 'TryPickUpDrop', addr: '0x63ea60' },
  { name: 'SendDropPickUpRequest', addr: '0x644450' },
  { name: 'OnBomb', addr: '0x650ec0' },
  { name: 'OnDoomed', addr: '0x64ed40' },
  { name: 'OnSwallowed', addr: '0x641810' },
  { name: 'OnDestructByMiss', addr: '0x64ea30' },
  { name: 'OnRevive', addr: '0x640aa0' },
  { name: 'MakeNameTag', addr: '0x646ae0' },
  { name: 'SetDamagedByMob', addr: '0x64b260' },
  { name: 'CheckDamagedByMob', addr: '0x63d4b0' },
  { name: 'SetGuided', addr: '0x644570' },
  { name: 'ResetGuided', addr: '0x6410b0' },
  { name: 'SetTimeBombTime', addr: '0x63b720' },
  { name: 'UpdateTimeBomb', addr: '0x643c30' },
  { name: 'SetRandTimeForAreaAttack', addr: '0x643b80' },
  { name: 'SetShoeAttr', addr: '0x641e50' },
  { name: 'GetShoeAttr', addr: '0x640c20' },
  { name: 'LoadLayer', addr: '0x644900' },
  { name: 'LoadEffectLayer', addr: '0x6458e0' },
  { name: 'ShowCatchEffect', addr: '0x63b220' },
  { name: 'ShowEffectByItem', addr: '0x63b2d0' },
  { name: 'TryFirstAttack', addr: '0x6482f0' },
  { name: 'TryFirstSelfDestruction', addr: '0x640ee0' },
  { name: 'GetActionDelay', addr: '0x63e970' },
  { name: 'GetType', addr: '0x64cf70' },
  { name: 'GetRTTI', addr: '0x64cf80' },
  { name: 'GetZMass', addr: '0x64cfa0' },
  { name: 'IsKindOf', addr: '0x64cfc0' },
  { name: 'GetPos', addr: '0x64cff0' },
  { name: 'GetPosPrev', addr: '0x64d020' },
];

function postMessage(sessionUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const req = http.request({
      hostname: MCP_HOST, port: MCP_PORT,
      path: sessionUrl, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function connectSSE() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 10000 }, (res) => resolve(res));
    req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
    req.on('error', reject);
  });
}

function decompileOne(addr, rpcId) {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => { sseRes.destroy(); reject(new Error('Decompile timeout ' + addr)); }, 300000);
    let sessionUrl = null;
    let responseReceived = false;
    let sseRes;
    try { sseRes = await connectSSE(); } catch(e) { clearTimeout(timeout); reject(e); return; }
    sseRes.setEncoding('utf8');
    let sseBuffer = '';
    sseRes.on('data', (chunk) => {
      if (responseReceived) return;
      sseBuffer += chunk;
      if (!sessionUrl) {
        const m = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
        if (m) {
          sessionUrl = m[1].trim();
          const payload = JSON.stringify({
            jsonrpc: '2.0', id: rpcId,
            method: 'tools/call',
            params: { name: 'decompile', arguments: { addr: addr } }
          });
          postMessage(sessionUrl, payload).catch(e => { clearTimeout(timeout); reject(e); });
          return;
        }
      }
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (parsed.id === rpcId && parsed.result) {
                responseReceived = true;
                clearTimeout(timeout);
                sseRes.destroy();
                resolve(parsed);
                return;
              }
            } catch {}
          }
        }
      }
    });
    sseRes.on('error', (e) => { clearTimeout(timeout); reject(e); });
    sseRes.on('end', () => { if (!responseReceived) { clearTimeout(timeout); reject(new Error('SSE ended without response')); } });
  });
}

async function main() {
  const skipNames = process.argv.includes('--skip-existing') 
    ? new Set(fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('cmob_') && f.endsWith('_clean.txt')).map(f => f.replace('cmob_', '').replace('_clean.txt', '')))
    : new Set();
  
  let success = 0, fail = 0, skip = 0;
  for (let i = 0; i < METHODS.length; i++) {
    const m = METHODS[i];
    if (skipNames.has(m.name)) { skip++; console.log(`SKIP ${m.name}`); continue; }
    console.log(`[${i+1}/${METHODS.length}] ${m.name} @ ${m.addr}...`);
    try {
      const result = await decompileOne(m.addr, i + 1000);
      let code = '';
      if (result.result?.content) {
        for (const c of result.result.content) {
          if (c.type === 'text') { code = c.text; break; }
        }
      }
      try { const inner = JSON.parse(code); if (inner.code) code = inner.code; } catch(e) {}
      if (code.includes('\\n')) code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      fs.writeFileSync(path.join(OUTPUT_DIR, `cmob_${m.name}_clean.txt`), code, 'utf8');
      success++;
      console.log(`  OK (${code.length} chars)`);
    } catch (e) {
      fail++;
      console.error(`  FAILED: ${e.message}`);
    }
  }
  console.log(`\nDone: ${success} success, ${fail} failed, ${skip} skipped`);
}

main().catch(console.error);
