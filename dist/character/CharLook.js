import { Container, Graphics } from 'pixi.js';
import { StanceToWzKey } from './Stance.js';
import { CharacterRenderer } from './CharacterRenderer.js';
import { AttackAction } from './AttackAction.js';
const ZeroAnchors = {
    navel: { x: 0, y: 0 },
    head: { x: 0, y: 0 },
    brow: { x: 0, y: 0 },
    muzzle: { x: 0, y: 0 },
};
export class CharLook {
    _renderer = null;
    _avatar = null;
    _currentAction = 'stand1';
    _frame = 0;
    _frameTimer = 0;
    _facingLeft = false;
    _skinId;
    _emotionId = 0;
    _emotionFrame = 0;
    _emotionFrameTimer = 0;
    _emotionDelays = [];
    _oneTimeActionTimer = 0;
    _anchors = ZeroAnchors;
    container = new Container();
    /** 5 OG-style layer containers: 0=UnderCharacter, 1=UnderFace, 2=Face,
        3=OverFace, 4=OverCharacter. */
    _layers = Array.from({ length: 5 }, () => new Container());
    Position = { x: 0, y: 0 };
    FootholdId = 0;
    ChairHeight = 0;
    constructor(skinId = 0) {
        this._skinId = skinId;
        for (const l of this._layers)
            this.container.addChild(l);
    }
    get AvatarLook() { return this._avatar; }
    get FacingLeft() { return this._facingLeft; }
    // Real per-frame anchor points (OG CActionFrame::Draw's ptNavel/ptHead/
    // ptBrow/ptMuzzle) in world space — computed once per `_rebuildDisplay()`
    // call (i.e. up to date as of the last rendered frame) rather than the
    // hardcoded per-consumer Y-offset guesses this replaces.
    get NavelPosition() {
        return { x: this.Position.x + this._anchors.navel.x * this.container.scale.x, y: this.Position.y + this._anchors.navel.y };
    }
    get HeadPosition() {
        return { x: this.Position.x + this._anchors.head.x * this.container.scale.x, y: this.Position.y + this._anchors.head.y };
    }
    get BrowPosition() {
        return { x: this.Position.x + this._anchors.brow.x * this.container.scale.x, y: this.Position.y + this._anchors.brow.y };
    }
    get MuzzlePosition() {
        return { x: this.Position.x + this._anchors.muzzle.x * this.container.scale.x, y: this.Position.y + this._anchors.muzzle.y };
    }
    SetAvatar(look) {
        this._avatar = look;
        if (look)
            this._skinId = look.skin;
    }
    /** OG CAvatar::SetChairHeight (903A50.c) — maps specific chair item IDs to
     *  Y-offset values. Default 0 means no offset. */
    SetChairHeight(nItemID) {
        if (nItemID === 3010125)
            this.ChairHeight = 1;
        else if (nItemID === 3010117 || nItemID === 3010118 || nItemID === 3010075)
            this.ChairHeight = 5;
        else if (nItemID === 3010177)
            this.ChairHeight = 6;
        else
            this.ChairHeight = 0;
    }
    Load(charWz, itemWz, baseWz, loader) {
        this._renderer = new CharacterRenderer(charWz, itemWz, baseWz, loader);
    }
    static FallbackActions = [
        'stand1', 'stand2', 'walk1', 'walk2', 'jump', 'fall', 'ladder', 'rope',
        'prone', 'proneStab', 'sit', 'dead', 'heal', 'fly', 'hit1', 'hit2',
        'shoot1', 'shoot2', 'shoot3',
        'attack1', 'attack2', 'attack3', 'attack4', 'attack5', 'attack6', 'attack7', 'attack8',
        'skill1', 'skill2', 'skill3', 'skill4',
        'alert', 'swingO1', 'swingO2', 'swingO3', 'swingP1', 'swingP2', 'swingP3',
        'swingOF', 'swingPF',
    ];
    ActionExists(actionKey) {
        if (this._renderer === null || this._avatar === null) {
            return CharLook.FallbackActions.includes(actionKey);
        }
        return this._renderer.FrameCount(this._avatar, actionKey) > 1;
    }
    SetStance(stance) {
        this.StartAction(StanceToWzKey(stance));
    }
    StartAction(actionKey) {
        if (!this.ActionExists(actionKey)) {
            // OG: when WZ data lacks the animation, fall back to the action key
            // itself (for stance keys like 'jump', 'ladder', 'rope') rather than
            // always falling back to 'stand1'. Only fall back to 'stand1' if the
            // key is not in the known action set at all.
            if (!CharLook.FallbackActions.includes(actionKey)) {
                actionKey = 'stand1';
            }
        }
        if (actionKey !== this._currentAction) {
            this._currentAction = actionKey;
            this._frame = 0;
            this._frameTimer = 0;
        }
    }
    Attack() {
        if (this._renderer === null || this._avatar === null)
            return;
        const prone = this._currentAction === 'prone' || this._currentAction === 'proneStab';
        const action = this._renderer.PickAttackAction(this._avatar, prone);
        // PlayOneTimeAction, not bare StartAction: without the one-time-action
        // timer this set, the very next UpdateFromPhysics() call (every frame,
        // for both the local player and other players) would immediately
        // overwrite it with the current movement stance before a single frame
        // of the attack pose was visible.
        this.PlayOneTimeAction(action);
    }
    PickAttackAction() {
        if (this._renderer === null || this._avatar === null)
            return null;
        const prone = this._currentAction === 'prone' || this._currentAction === 'proneStab';
        return this._renderer.PickAttackAction(this._avatar, prone);
    }
    PlayAttackAction(actionKey) {
        this.PlayOneTimeAction(actionKey);
    }
    PlayAttackCode(action) {
        const actionKey = AttackAction.FromCode(action);
        if (!actionKey || !this.ActionExists(actionKey))
            return false;
        this.PlayOneTimeAction(actionKey);
        return true;
    }
    /** True while a one-shot action (attack/skill) is still playing — matches
     *  OG's `CAvatar::GetOneTimeAction() > -1` gate, which blocks stance-driven
     *  actions (walk/stand/jump) from overriding it until it naturally ends. */
    get IsPlayingOneTimeAction() { return this._oneTimeActionTimer > 0; }
    /** Plays `actionKey` once, blocking stance updates for its real WZ frame
     *  duration (sum of per-frame delays), then resumes normal stance-driven
     *  animation. Falls back to a flat 500ms if the action has no per-frame
     *  delay data (e.g. action not found in the WZ tree for this avatar). */
    PlayOneTimeAction(actionKey) {
        this.StartAction(actionKey);
        this._oneTimeActionTimer = this._actionDuration(actionKey) || 0.5;
    }
    _actionDuration(actionKey) {
        if (this._renderer === null || this._avatar === null)
            return 0;
        const frameCount = this._renderer.FrameCount(this._avatar, actionKey);
        if (frameCount <= 0)
            return 0;
        let totalMs = 0;
        for (let i = 0; i < frameCount; i++) {
            const d = this._renderer.GetFrameDelay(this._avatar, actionKey, i);
            totalMs += d > 0 ? d : 120;
        }
        return totalMs / 1000;
    }
    SetEmotion(emotionId) {
        this._emotionId = emotionId;
        this._emotionFrame = 0;
        this._emotionFrameTimer = 0;
        // Real per-frame delay list straight from the WZ Face/<id>.img/<emotion>
        // node (CharacterRenderer.EmotionFrameDelays — already correctly
        // implemented, previously a zero-caller). Replaces a prior hardcoded
        // 1-second duration with no real per-frame timing data behind it at all.
        this._emotionDelays = this._renderer !== null && this._avatar !== null
            ? this._renderer.EmotionFrameDelays(this._avatar.face, emotionId)
            : [];
    }
    UpdateFromPhysics(dt, stance, facingLeft) {
        this._facingLeft = facingLeft;
        this._tickOneTimeAction(dt);
        if (!this.IsPlayingOneTimeAction)
            this.StartAction(StanceToWzKey(stance));
        this._advanceEmotion(dt);
        if (this._renderer !== null)
            this._renderer.Update(dt);
        this._advanceFrame(dt);
    }
    Update(dt, pos, facingLeft, climbing) {
        this.Position = { x: pos.x, y: pos.y };
        this._facingLeft = facingLeft;
        this._tickOneTimeAction(dt);
        this._advanceEmotion(dt);
        if (this._renderer !== null)
            this._renderer.Update(dt);
        this._advanceFrame(dt);
    }
    _tickOneTimeAction(dt) {
        if (this._oneTimeActionTimer > 0)
            this._oneTimeActionTimer = Math.max(0, this._oneTimeActionTimer - dt);
    }
    _advanceEmotion(dt) {
        if (this._emotionId === 0)
            return;
        if (this._emotionDelays.length === 0) {
            // No real per-frame delay data found (face/emotion combo missing from
            // the WZ tree) — fall back to a fixed 1s one-shot, then clear, same
            // overall behavior as before this fix for the "data missing" case.
            this._emotionFrameTimer += dt;
            if (this._emotionFrameTimer >= 1.0) {
                this._emotionId = 0;
                this._emotionFrame = 0;
            }
            return;
        }
        this._emotionFrameTimer += dt * 1000;
        let delay = this._emotionDelays[this._emotionFrame];
        if (delay <= 0)
            delay = 2500;
        if (this._emotionFrameTimer < delay)
            return;
        this._emotionFrameTimer -= delay;
        this._emotionFrame++;
        if (this._emotionFrame >= this._emotionDelays.length) {
            // Emotions are one-shot (not looping) — matches the prior single-pass
            // "play once, then revert" behavior.
            this._emotionId = 0;
            this._emotionFrame = 0;
        }
    }
    _advanceFrame(dt) {
        if (this._renderer === null || this._avatar === null)
            return;
        const frameCount = this._renderer.FrameCount(this._avatar, this._currentAction);
        if (frameCount <= 1)
            return;
        let delayMs = this._getFrameDelay(this._currentAction, this._frame);
        if (delayMs <= 0)
            delayMs = 120;
        this._frameTimer += dt * 1000;
        if (this._frameTimer >= delayMs) {
            this._frameTimer -= delayMs;
            this._frame = (this._frame + 1) % frameCount;
        }
    }
    _getFrameDelay(actionKey, frameIdx) {
        if (this._renderer === null || this._avatar === null)
            return 120;
        return this._renderer.GetFrameDelay(this._avatar, actionKey, frameIdx);
    }
    Draw(camX, camY, cx, cy) {
        this._rebuildDisplay();
        this.container.position.set(this.Position.x - camX + cx, this.Position.y - camY + cy);
    }
    /** Rebuilds the body sprites from the current action/frame without
        touching `container`'s position — for callers (OtherCharLook) that
        position the wrapper container themselves. */
    RebuildDisplay() {
        this._rebuildDisplay();
    }
    _rebuildDisplay() {
        for (const l of this._layers)
            l.removeChildren();
        // OG CAvatar::AvatarLayerFlip — put_flip on each IWzGr2DLayer.
        this.container.scale.x = this._facingLeft ? 1 : -1;
        if (this._renderer === null || this._avatar === null) {
            this._anchors = ZeroAnchors;
            this._addPlaceholder();
            return;
        }
        const results = this._renderer.Draw(this._avatar, this._currentAction, this._frame, 0, 0, this._facingLeft, this._emotionId, this._emotionFrame);
        this._anchors = results.anchors;
        for (let i = 0; i < 5; i++) {
            for (const sp of results.layers[i]) {
                this._layers[i].addChild(sp);
            }
        }
    }
    _addPlaceholder() {
        const gfx = new Graphics();
        gfx.rect(-15, -60, 30, 60).fill({ color: 0x3c2850, alpha: 0.78 });
        gfx.rect(-10, -78, 20, 18).fill({ color: 0xdcb48c, alpha: 0.78 });
        this._layers[1].addChild(gfx);
    }
}
//# sourceMappingURL=CharLook.js.map