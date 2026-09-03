import { Container } from 'pixi.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
type CasterDisplay = {
    x: number;
    y: number;
    facingLeft?: boolean;
};
export declare class SkillEffectOverlay {
    private _loader;
    private _worldEntries;
    private _screenEntries;
    constructor(_loader: WzTextureLoader);
    /** Plays an `effect`/`effect0` node anchored to a character's world
        position (re-tracked every frame via the charId -> position lookup
        passed to Draw, same pattern as ChatBalloonLayer). No-op if the node
        is empty/unresolvable. */
    PlayAtCaster(node: unknown, charId: number, facingLeft?: boolean): void;
    /** Persistent keyed caster effect, used for stateful item effects that stay
        active until the server explicitly clears them. */
    PlayLoopAtCaster(key: string, node: unknown, charId: number, facingLeft?: boolean): void;
    CancelLoopAtCaster(key: string, charId: number): void;
    /** Plays an indexed variant of a skill effect — OG Effect_SkillUse's
     *  `<sEffect>/<index>` loop (format 986). The caller resolves the WZ
     *  sub-node (e.g. `skill/1111.img/effect/3`) before calling this;
     *  this method just plays the resolved frames like any other node.
     *  ponytail: identical to PlayAtCaster — the variant selection is the
     *  caller's responsibility (GameStage._onUserEffect handles it). */
    PlayIndexedVariant(node: unknown, charId: number, _index: number): void;
    /** Plays a `screen` node centered on the viewport, ignoring camera/world
        position entirely (matches OG's full-screen skill-cast flashes). */
    /** Plays a `keyDown` or similar charging-effect node that animates once
        then holds on the final frame until explicitly removed via CancelHold.
        Matches OG `CUser::ShowSkillPrepare`'s looping prepare animation tracked
        per-character in `CAnimationDisplayer::m_mPrepare` (decompile/8E8160.c,
        45B840.c). */
    PlayHoldAtCaster(node: unknown, charId: number, facingLeft?: boolean): void;
    /** Removes the hold animation for a given character, matching OG
        `CAnimationDisplayer::RemovePrepareAnimation` (decompile/441B50.c).
        No-op if no hold entry exists for that charId. */
    CancelHold(charId: number): void;
    PlayFullScreen(node: unknown): void;
    Clear(): void;
    Update(dt: number): void;
    private static _advanceAll;
    /** Rebuild the world-anchored layer. `charScreenPos` resolves a charId to
        its current head/body anchor in screen space (null if that character
        is no longer present, e.g. left the field mid-effect). */
    RebuildWorldDisplay(charScreenPos: (charId: number) => CasterDisplay | null): Container;
    /** Rebuild the screen-anchored layer at the viewport center. */
    RebuildScreenDisplay(screenCenter: {
        x: number;
        y: number;
    }): Container;
    private _buildAnim;
}
export {};
//# sourceMappingURL=SkillEffectOverlay.d.ts.map