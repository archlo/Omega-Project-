import { Container } from 'pixi.js';
import { loadFrameSequence, totalDurationMs } from './WzFrameAnimation.js';
export class SkillEffectOverlay {
    _loader;
    _worldEntries = [];
    _screenEntries = [];
    constructor(_loader) {
        this._loader = _loader;
    }
    /** Plays an `effect`/`effect0` node anchored to a character's world
        position (re-tracked every frame via the charId -> position lookup
        passed to Draw, same pattern as ChatBalloonLayer). No-op if the node
        is empty/unresolvable. */
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: capture caster facing so world skill effects mirror correctly.
    PlayAtCaster(node, charId, facingLeft = true) {
        const anim = this._buildAnim(node);
        if (anim === null)
            return;
        this._worldEntries.push({ Animation: anim, CharId: charId, Key: null, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false, Repeat: false });
    }
    /** Persistent keyed caster effect, used for stateful item effects that stay
        active until the server explicitly clears them. */
    PlayLoopAtCaster(key, node, charId, facingLeft = true) {
        this.CancelLoopAtCaster(key, charId);
        const anim = this._buildAnim(node);
        if (anim === null)
            return;
        this._worldEntries.push({ Animation: anim, CharId: charId, Key: key, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false, Repeat: true });
    }
    CancelLoopAtCaster(key, charId) {
        for (let i = this._worldEntries.length - 1; i >= 0; i--) {
            const e = this._worldEntries[i];
            if (e.Repeat && e.Key === key && e.CharId === charId)
                this._worldEntries.splice(i, 1);
        }
    }
    /** Plays an indexed variant of a skill effect — OG Effect_SkillUse's
     *  `<sEffect>/<index>` loop (format 986). The caller resolves the WZ
     *  sub-node (e.g. `skill/1111.img/effect/3`) before calling this;
     *  this method just plays the resolved frames like any other node.
     *  ponytail: identical to PlayAtCaster — the variant selection is the
     *  caller's responsibility (GameStage._onUserEffect handles it). */
    PlayIndexedVariant(node, charId, _index) {
        this.PlayAtCaster(node, charId);
    }
    /** Plays a `screen` node centered on the viewport, ignoring camera/world
        position entirely (matches OG's full-screen skill-cast flashes). */
    /** Plays a `keyDown` or similar charging-effect node that animates once
        then holds on the final frame until explicitly removed via CancelHold.
        Matches OG `CUser::ShowSkillPrepare`'s looping prepare animation tracked
        per-character in `CAnimationDisplayer::m_mPrepare` (decompile/8E8160.c,
        45B840.c). */
    PlayHoldAtCaster(node, charId, facingLeft = true) {
        const anim = this._buildAnim(node);
        if (anim === null)
            return;
        this._worldEntries.push({ Animation: anim, CharId: charId, Key: null, FacingLeft: facingLeft, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: true, Repeat: false });
    }
    /** Removes the hold animation for a given character, matching OG
        `CAnimationDisplayer::RemovePrepareAnimation` (decompile/441B50.c).
        No-op if no hold entry exists for that charId. */
    CancelHold(charId) {
        for (let i = this._worldEntries.length - 1; i >= 0; i--) {
            if (this._worldEntries[i].Hold && this._worldEntries[i].CharId === charId) {
                this._worldEntries.splice(i, 1);
            }
        }
    }
    PlayFullScreen(node) {
        const anim = this._buildAnim(node);
        if (anim === null)
            return;
        this._screenEntries.push({ Animation: anim, FrameIndex: 0, FrameTimerMs: 0, TotalAgeMs: 0, Hold: false });
    }
    Clear() {
        this._worldEntries = [];
        this._screenEntries = [];
    }
    Update(dt) {
        const ms = dt * 1000;
        SkillEffectOverlay._advanceAll(this._worldEntries, ms);
        SkillEffectOverlay._advanceAll(this._screenEntries, ms);
    }
    static _advanceAll(entries, ms) {
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
                if (e.FrameTimerMs < d)
                    break;
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
    RebuildWorldDisplay(charScreenPos) {
        const root = new Container();
        for (const e of this._worldEntries) {
            const screen = charScreenPos(e.CharId);
            if (screen === null)
                continue;
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
    RebuildScreenDisplay(screenCenter) {
        const root = new Container();
        for (const e of this._screenEntries) {
            const frame = e.Animation.Frames[Math.min(e.FrameIndex, e.Animation.Frames.length - 1)];
            const sprite = frame.sprite.NewSprite(false);
            sprite.position.set(screenCenter.x, screenCenter.y);
            root.addChild(sprite);
        }
        return root;
    }
    _buildAnim(node) {
        const frames = loadFrameSequence(this._loader, node);
        if (frames.length === 0)
            return null;
        return { Frames: frames, TotalDurationMs: totalDurationMs(frames) };
    }
}
//# sourceMappingURL=SkillEffectOverlay.js.map