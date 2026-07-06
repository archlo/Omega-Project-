import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { AnimFrame, loadFrameSequence, totalDurationMs } from './WzFrameAnimation.js';

/**
One-shot skill-cast visual overlays from Skill.wz's per-skill `effect`/
`effect0` (anchored to the caster, world space) and `screen` (anchored to
the screen center, ignores camera) nodes. Frame shape confirmed by
inspecting the real WZ data: a property with numeric-keyed canvas children
(not always contiguous — e.g. 0..18, then a gap, then 27), each canvas
carrying its own `delay` (ms) and `origin` (baked into WzSprite already by
WzTextureLoader). `hit` (the target-side hit-splash, nested one level
deeper at hit/<variant>/<frame>) is NOT handled here — that belongs to the
mob-hit pipeline, a separate system from skill-cast visuals.

Verified against OG (live IDA decompile of Maplestory95.exe.i64): the real
entry point is `CUser::ShowSkillEffect` -> `CAnimationDisplayer::
Effect_SkillUse` -> `LoadLayer` -> `IWzGr2D::CreateLayer`, and `CreateLayer`
hands the whole resolved WZ property to the native engine, which animates
through that property's own numbered children — i.e. "numbered subkeys =
sequential frames played once" (this class's model) IS the real default
behavior, confirmed for Power Strike/Slash Blast/Bamboo Thrust and the
generic path `ShowSkillEffect` takes for ordinary skills.

KNOWN GAP, narrow and not modeled: `Effect_SkillUse` also has its own
`-1..nLast` indexed-variant loop (building `<sEffect>/<index>` path
strings, format-string id 986) used by a handful of skill categories —
confirmed for Crusader's Combo Attack family (nSkillID 1111003, where the
index is the current combo-stack count `nComboCounter`, i.e. a *selected*
variant driven by live game state, not a played-through sequence) and
inlined again elsewhere in `ShowSkillEffect` for at least one other
category. Skills that need this would currently get every numbered subkey
played as one sequence instead of the one variant matching current game
state. Not fixed here — would need per-skill game-state plumbing (e.g.
combo count) this client doesn't track yet, and is narrow enough (combo/
stack-counter skills) to defer rather than build speculatively.
*/
interface Anim {
  Frames: AnimFrame[];
  TotalDurationMs: number;
}

interface WorldEntry {
  Animation: Anim;
  CharId: number;
  Key: string | null;
  FacingLeft: boolean;
  FrameIndex: number;
  FrameTimerMs: number;
  TotalAgeMs: number;
  Hold: boolean;
  Repeat: boolean;
}

interface ScreenEntry {
  Animation: Anim;
  FrameIndex: number;
  FrameTimerMs: number;
  TotalAgeMs: number;
  Hold: boolean;
}

type CasterDisplay = { x: number; y: number; facingLeft?: boolean };

export class SkillEffectOverlay {
  private _worldEntries: WorldEntry[] = [];
  private _screenEntries: ScreenEntry[] = [];

  constructor(private _loader: WzTextureLoader) {}

  /** Plays an `effect`/`effect0` node anchored to a character's world
      position (re-tracked every frame via the charId -> position lookup
      passed to Draw, same pattern as ChatBalloonLayer). No-op if the node
      is empty/unresolvable. */
  // TODO_AUDIT.md Hundred-and-forty-ninth pass: capture caster facing so world skill effects mirror correctly.
  PlayAtCaster(node: unknown, charId: number, facingLeft = true): void {
    const anim = this._buildAnim(node);
    if (anim === null) return;
    this._worldEntries.push({ Animation: anim, CharId: charId, Key: null, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false, Repeat: false });
  }

  /** Persistent keyed caster effect, used for stateful item effects that stay
      active until the server explicitly clears them. */
  PlayLoopAtCaster(key: string, node: unknown, charId: number, facingLeft = true): void {
    this.CancelLoopAtCaster(key, charId);
    const anim = this._buildAnim(node);
    if (anim === null) return;
    this._worldEntries.push({ Animation: anim, CharId: charId, Key: key, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false, Repeat: true });
  }

  CancelLoopAtCaster(key: string, charId: number): void {
    for (let i = this._worldEntries.length - 1; i >= 0; i--) {
      const e = this._worldEntries[i];
      if (e.Repeat && e.Key === key && e.CharId === charId) this._worldEntries.splice(i, 1);
    }
  }

  /** Plays an indexed variant of a skill effect — OG Effect_SkillUse's
   *  `<sEffect>/<index>` loop (format 986). The caller resolves the WZ
   *  sub-node (e.g. `skill/1111.img/effect/3`) before calling this;
   *  this method just plays the resolved frames like any other node.
   *  ponytail: identical to PlayAtCaster — the variant selection is the
   *  caller's responsibility (GameStage._onUserEffect handles it). */
  PlayIndexedVariant(node: unknown, charId: number, _index: number): void {
    this.PlayAtCaster(node, charId);
  }

  /** Plays a `screen` node centered on the viewport, ignoring camera/world
      position entirely (matches OG's full-screen skill-cast flashes). */
  /** Plays a `keyDown` or similar charging-effect node that animates once
      then holds on the final frame until explicitly removed via CancelHold.
      Matches OG `CUser::ShowSkillPrepare`'s looping prepare animation tracked
      per-character in `CAnimationDisplayer::m_mPrepare` (decompile/8E8160.c,
      45B840.c). */
  PlayHoldAtCaster(node: unknown, charId: number, facingLeft = true): void {
    const anim = this._buildAnim(node);
    if (anim === null) return;
    this._worldEntries.push({ Animation: anim, CharId: charId, Key: null, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: true, Repeat: false });
  }

  /** Removes the hold animation for a given character, matching OG
      `CAnimationDisplayer::RemovePrepareAnimation` (decompile/441B50.c).
      No-op if no hold entry exists for that charId. */
  CancelHold(charId: number): void {
    for (let i = this._worldEntries.length - 1; i >= 0; i--) {
      if (this._worldEntries[i].Hold && this._worldEntries[i].CharId === charId) {
        this._worldEntries.splice(i, 1);
      }
    }
  }

  PlayFullScreen(node: unknown): void {
    const anim = this._buildAnim(node);
    if (anim === null) return;
    this._screenEntries.push({ Animation: anim, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false });
  }

  Clear(): void {
    this._worldEntries = [];
    this._screenEntries = [];
  }

  Update(dt: number): void {
    const ms = dt * 1000;
    SkillEffectOverlay._advanceAll(this._worldEntries, ms);
    SkillEffectOverlay._advanceAll(this._screenEntries, ms);
  }

  private static _advanceAll<T extends { Animation: Anim; FrameIndex: number; FrameTimerMs: number; TotalAgeMs: number; Hold: boolean; Repeat?: boolean }>(
    entries: T[], ms: number,
  ): void {
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      e.TotalAgeMs += ms;
      if (!e.Hold && !e.Repeat && e.TotalAgeMs >= e.Animation.TotalDurationMs) {
        entries.splice(i, 1);
        continue;
      }
      e.FrameTimerMs += ms;
      while (e.FrameIndex < e.Animation.Frames.length - 1) {
        const d = e.Animation.Frames[e.FrameIndex].delayMs;
        if (e.FrameTimerMs < d) break;
        e.FrameTimerMs -= d;
        e.FrameIndex++;
      }
      if (e.Repeat && e.FrameIndex >= e.Animation.Frames.length - 1) {
        const d = e.Animation.Frames[e.FrameIndex].delayMs;
        if (e.FrameTimerMs >= d) {
          e.FrameTimerMs -= d;
          e.FrameIndex = 0;
          e.TotalAgeMs = 0;
        }
      }
      if (e.Hold && e.FrameIndex >= e.Animation.Frames.length - 1) {
        e.FrameIndex = e.Animation.Frames.length - 1;
      }
    }
  }

  /** Rebuild the world-anchored layer. `charScreenPos` resolves a charId to
      its current head/body anchor in screen space (null if that character
      is no longer present, e.g. left the field mid-effect). */
  RebuildWorldDisplay(charScreenPos: (charId: number) => CasterDisplay | null): Container {
    const root = new Container();
    for (const e of this._worldEntries) {
      const screen = charScreenPos(e.CharId);
      if (screen === null) continue;
      const frame = e.Animation.Frames[Math.min(e.FrameIndex, e.Animation.Frames.length - 1)];
      // TODO_AUDIT.md Hundred-and-seventy-first pass: OG ONETIMEINFO mirrors
      // the reference layer's flip every tick, so use live caster facing when available.
      const facingLeft = screen.facingLeft ?? e.FacingLeft;
      const sprite = frame.sprite.NewSprite(!facingLeft);
      sprite.position.set(screen.x, screen.y);
      root.addChild(sprite);
    }
    return root;
  }

  /** Rebuild the screen-anchored layer at the viewport center. */
  RebuildScreenDisplay(screenCenter: { x: number; y: number }): Container {
    const root = new Container();
    for (const e of this._screenEntries) {
      const frame = e.Animation.Frames[Math.min(e.FrameIndex, e.Animation.Frames.length - 1)];
      const sprite = frame.sprite.NewSprite(false);
      sprite.position.set(screenCenter.x, screenCenter.y);
      root.addChild(sprite);
    }
    return root;
  }

  private _buildAnim(node: unknown): Anim | null {
    const frames = loadFrameSequence(this._loader, node);
    if (frames.length === 0) return null;
    return { Frames: frames, TotalDurationMs: totalDurationMs(frames) };
  }
}
