import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzVector } from '../wz/WzVector.js';
import { WzCanvas } from '../wz/WzCanvas.js';

export interface CharacterImgEntry {
  id: number;
  pImg: WzProperty;
}

export interface MobImgEntry {
  id: number;
  pImg: WzProperty;
}

export interface NpcImgEntry {
  id: number;
  pImg: WzProperty;
}

export interface PetImgEntry {
  id: number;
  pImg: WzProperty;
}

export interface ActionEntry {
  frames: number;
  delayMs: number[];
}

export interface AfterimageAction {
  range: { left: number; top: number; right: number; bottom: number } | null;
  frames: number;
}

export interface AfterimageEntry {
  actions: Map<string, AfterimageAction>;
}

export class CActionMan {
  private _charEntries = new Map<number, CharacterImgEntry>();
  private _mobEntries = new Map<number, MobImgEntry>();
  private _npcEntries = new Map<number, NpcImgEntry>();
  private _petEntries = new Map<number, PetImgEntry>();
  private _dragonEntries = new Map<number, { pImg: WzProperty }>();
  private _actionFrameCounts = new Map<string, number>();
  private _afterimageCache = new Map<string, AfterimageEntry>();

  constructor(
    private _characterWz: WzPackage | null,
    private _itemWz: WzPackage | null,
    private _mobWz: WzPackage | null = null,
    private _npcWz: WzPackage | null = null,
    private _petWz: WzPackage | null = null,
    private _dragonWz: WzPackage | null = null,
  ) {}

  GetCharacterImgEntry(equipId: number): CharacterImgEntry | null {
    if (this._charEntries.has(equipId)) return this._charEntries.get(equipId) ?? null;
    const path = `${equipId.toString().padStart(8, '0')}.img`;
    const node = this._characterWz?.GetItem(path);
    if (!(node instanceof WzProperty)) return null;
    const entry: CharacterImgEntry = { id: equipId, pImg: node };
    this._charEntries.set(equipId, entry);
    return entry;
  }

  GetMobImgEntry(mobId: number): MobImgEntry | null {
    if (this._mobEntries.has(mobId)) return this._mobEntries.get(mobId) ?? null;
    const path = `${mobId.toString().padStart(7, '0')}.img`;
    const node = this._mobWz?.GetItem(path);
    if (!(node instanceof WzProperty)) return null;
    const entry: MobImgEntry = { id: mobId, pImg: node };
    this._mobEntries.set(mobId, entry);
    return entry;
  }

  GetNpcImgEntry(npcId: number): NpcImgEntry | null {
    if (this._npcEntries.has(npcId)) return this._npcEntries.get(npcId) ?? null;
    const path = `${npcId.toString().padStart(7, '0')}.img`;
    const node = this._npcWz?.GetItem(path);
    if (!(node instanceof WzProperty)) return null;
    const entry: NpcImgEntry = { id: npcId, pImg: node };
    this._npcEntries.set(npcId, entry);
    return entry;
  }

  GetPetImgEntry(petId: number): PetImgEntry | null {
    if (this._petEntries.has(petId)) return this._petEntries.get(petId) ?? null;
    const path = `${petId.toString().padStart(8, '0')}.img`;
    const node = this._petWz?.GetItem(path);
    if (!(node instanceof WzProperty)) return null;
    const entry: PetImgEntry = { id: petId, pImg: node };
    this._petEntries.set(petId, entry);
    return entry;
  }

  GetDragonImgEntry(dragonId: number): { pImg: WzProperty } | null {
    if (this._dragonEntries.has(dragonId)) return this._dragonEntries.get(dragonId) ?? null;
    const path = `${dragonId.toString().padStart(8, '0')}.img`;
    const node = this._dragonWz?.GetItem(path);
    if (!(node instanceof WzProperty)) return null;
    const entry = { pImg: node };
    this._dragonEntries.set(dragonId, entry);
    return entry;
  }

  GetActionEntry(entry: CharacterImgEntry | MobImgEntry | NpcImgEntry | PetImgEntry, action: string): ActionEntry | null {
    const key = `${entry.id}:${action}`;
    const cached = this._actionFrameCounts.get(key);
    if (cached !== undefined) {
      if (cached < 0) return null;
      return { frames: cached, delayMs: [] };
    }

    const actionNode = entry.pImg.Get(action);
    if (!(actionNode instanceof WzProperty)) {
      this._actionFrameCounts.set(key, -1);
      return null;
    }

    let frameCount = 0;
    const delays: number[] = [];
    while (true) {
      const frame = actionNode.Get(String(frameCount));
      if (!(frame instanceof WzProperty)) break;
      const delay = frame.Get('delay');
      delays.push(typeof delay === 'number' ? delay : typeof delay === 'bigint' ? Number(delay) : 120);
      frameCount++;
    }
    this._actionFrameCounts.set(key, frameCount);
    return frameCount > 0 ? { frames: frameCount, delayMs: delays } : null;
  }

  GetFrameDelay(entry: CharacterImgEntry | MobImgEntry, action: string, frameIdx: number): number {
    const act = this.GetActionEntry(entry, action);
    if (!act || frameIdx >= act.delayMs.length) return 120;
    return act.delayMs[frameIdx] > 0 ? act.delayMs[frameIdx] : 120;
  }

  LoadBodyEntry(bodyId: number): CharacterImgEntry | null {
    return this.GetCharacterImgEntry(bodyId);
  }

  private _loadAfterimage(uol: string): AfterimageEntry | null {
    const root = this._characterWz?.GetItem(`WeaponAfterimage.img/${uol}`);
    if (!(root instanceof WzProperty)) return null;

    const actions = new Map<string, AfterimageAction>();
    const actionNames = Object.keys(root.Items);
    for (const name of actionNames) {
      const actionNode = root.Get(name);
      if (!(actionNode instanceof WzProperty)) continue;

      let range: { left: number; top: number; right: number; bottom: number } | null = null;
      const lt = actionNode.Get('lt');
      const rb = actionNode.Get('rb');
      if (lt instanceof WzVector && rb instanceof WzVector) {
        range = { left: lt.X, top: lt.Y, right: rb.X, bottom: rb.Y };
      }

      let frameCount = 0;
      while (true) {
        const frame = actionNode.Get(String(frameCount));
        if (!(frame instanceof WzCanvas)) break;
        frameCount++;
      }

      actions.set(name, { range, frames: frameCount });
    }

    const entry: AfterimageEntry = { actions };
    this._afterimageCache.set(uol, entry);
    return entry;
  }

  GetWeaponAfterImage(uol: string): AfterimageEntry | null {
    const cached = this._afterimageCache.get(uol);
    if (cached !== undefined) return cached;
    return this._loadAfterimage(uol);
  }

  GetMeleeAttackRange(uol: string, actionName: string): { left: number; top: number; right: number; bottom: number } | null {
    const afterimage = this.GetWeaponAfterImage(uol);
    if (!afterimage) return null;
    const action = afterimage.actions.get(actionName);
    if (!action) return null;
    return action.range;
  }
}
