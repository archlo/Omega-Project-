import { Container } from 'pixi.js';
import { PetLook } from './PetLook.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { DecodedMovePath } from '../net/packet/MovePathDecoder.js';
import { RemoteMoveReplay } from './RemoteMoveReplay.js';

const PET_FOLLOW_DIST = 35;
const PET_FOLLOW_SPEED = 480;

export class Pet {
  readonly look: PetLook;
  private _ownerPos = { x: 0, y: 0 };
  private _ownerFacingLeft = false;
  private _manualTimer = 0;
  private _replay = new RemoteMoveReplay();
  // OG: CPet::m_liPetLockerSN / m_aExceptionList. OnLoadExceptionList (0x6a1510)
  // only applies its list when the packet's SN matches this pet's own.
  LockerSN: bigint | null = null;
  ExceptionList: number[] = [];

  constructor(
    public readonly TemplateId: number,
    public readonly OwnerCharId: number,
  ) {
    this.look = new PetLook(TemplateId);
  }

  get container(): Container { return this.look.container; }
  get Position() { return this.look.Position; }
  set Position(v: { x: number; y: number }) { this.look.Position = v; }

  Load(loader: WzTextureLoader, charWz: WzPackage | null): void {
    this.look.Load(loader, charWz);
  }

  SetOwnerPosition(x: number, y: number, facingLeft: boolean): void {
    this._ownerPos = { x, y };
    this._ownerFacingLeft = facingLeft;
  }

  SnapNearOwner(): void {
    // TODO_AUDIT.md Hundred-and-forty-sixth pass: pet move packets currently
    // discard the full move path, but they still prove the pet is alive; keep
    // the rendered pet near its owner instead of leaving it stale/offscreen.
    this.Position = { x: this._ownerPos.x + (this._ownerFacingLeft ? 32 : -32), y: this._ownerPos.y };
    this._manualTimer = 0.4;
  }

  ReplayMove(path: DecodedMovePath): void {
    this._replay.SetPath(path, this.Position);
    this.look.SetState('walk');
  }

  PlayAction(action: number): void {
    this.look.PlayAction(action);
    this._manualTimer = 0.6;
  }

  SetExceptionList(lockerSN: bigint, itemIds: number[]): void {
    if (this.LockerSN !== null && lockerSN !== this.LockerSN) return;
    this.ExceptionList = itemIds;
  }

  // OG: CPet::OnActionCommand (0x6a3930) picks a randomized flavor
  // text/animation from WZ CPetTemplate::m_aInteraction/m_aFoodReaction,
  // not ported here (no CPetTemplate). This plays a generic success/fail
  // reaction in its place — see PacketArgs.ts PetActionCommandArgs.
  PlayReaction(success: boolean): void {
    this.look.PlayAction(success ? 1 : 0);
    this._manualTimer = 0.6;
  }

  Update(dt: number): void {
    this.look.FaceLeft(this._ownerFacingLeft);

    if (this._replay.Update(dt, this.Position)) {
      this.look.SetState('walk');
      this.look.container.position.set(this.Position.x, this.Position.y);
      this.look.Update(dt);
      return;
    }

    if (this._manualTimer > 0) {
      this._manualTimer = Math.max(0, this._manualTimer - dt);
      this.look.container.position.set(this.Position.x, this.Position.y);
      this.look.Update(dt);
      return;
    }

    const dx = this._ownerPos.x - this.Position.x;
    const dy = this._ownerPos.y - this.Position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > PET_FOLLOW_DIST) {
      const maxStep = PET_FOLLOW_SPEED * dt;
      const step = Math.min(dist - PET_FOLLOW_DIST, maxStep);
      const ratio = step / dist;
      this.Position.x += dx * ratio;
      this.Position.y += dy * ratio;
      this.look.SetState('walk');
    } else {
      this.look.SetState('stand');
    }

    this.look.container.position.set(this.Position.x, this.Position.y);
    this.look.Update(dt);
  }
}
