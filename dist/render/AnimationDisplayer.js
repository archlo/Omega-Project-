import { Container, Graphics } from 'pixi.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
// ---------------------------------------------------------------------------
// Internal active-entry types
// ---------------------------------------------------------------------------
class ActiveEffect {
    totalDuration;
    container = new Container();
    elapsed = 0;
    duration = 0;
    repeats = 0;
    ended = false;
    constructor(totalDuration) {
        this.totalDuration = totalDuration;
        this.duration = totalDuration;
    }
}
// ---------------------------------------------------------------------------
// AnimationDisplayer — full OG CAnimationDisplayer port
// ---------------------------------------------------------------------------
export class AnimationDisplayer {
    _effectWz;
    // TAnimation<T> containers — each backed by a simple array
    _oneTime = [];
    _repeat = [];
    _squib = [];
    _reserved = [];
    _absorbItem = [];
    _falling = [];
    _explosion = [];
    _chainlightning = [];
    _hookingChain = [];
    _fireCracker = [];
    _newYear = [];
    _follow = [];
    _motionBlur = [];
    _fade = [];
    _userState = [];
    _footHold = [];
    // OG: m_mPrepare — keyed by characterId, used by Effect_SkillPrepare
    _prepare = new Map();
    // OG: m_mChainlightning — per-character chainlightning overrides
    _chainlightningMap = new Map();
    // OG: m_pCenterOrigin — shared origin vector
    _centerOrigin = { x: 0, y: 0 };
    // OG: m_pLocalFadeLayer — field-wide fade overlay
    _localFadeLayer = null;
    _localFadeAlpha = 0;
    constructor(effectWz) {
        this._effectWz = effectWz;
    }
    // ---------------------------------------------------------------------------
    // Display container — all active animation layers
    // ---------------------------------------------------------------------------
    get container() {
        const root = new Container();
        this._addChildAll(root, this._oneTime);
        this._addChildAll(root, this._repeat);
        this._addChildAll(root, this._squib);
        for (const e of this._reserved)
            root.addChild(e.container);
        for (const e of this._absorbItem)
            root.addChild(e.container);
        for (const e of this._falling)
            root.addChild(e.container);
        for (const e of this._explosion)
            root.addChild(e.container);
        for (const e of this._chainlightning)
            root.addChild(e.container);
        for (const e of this._hookingChain)
            root.addChild(e.container);
        for (const e of this._fireCracker)
            root.addChild(e.container);
        for (const e of this._newYear)
            root.addChild(e.container);
        for (const e of this._follow)
            root.addChild(e.container);
        for (const e of this._motionBlur)
            root.addChild(e.container);
        for (const e of this._fade)
            root.addChild(e.container);
        for (const e of this._userState)
            root.addChild(e.container);
        for (const e of this._footHold)
            root.addChild(e.container);
        return root;
    }
    _addChildAll(root, list) {
        for (const e of list)
            root.addChild(e.container);
    }
    // ---------------------------------------------------------------------------
    // Update — OG: CAnimationDisplayer::Update (0x45BB80)
    // Called every frame. Advances all active animations and removes expired ones.
    // ---------------------------------------------------------------------------
    Update(dt) {
        this._updateEffects(this._oneTime, dt);
        this._updateEffects(this._repeat, dt);
        this._updateEffects(this._squib, dt);
        this._updateReserved(dt);
        this._updateAbsorbItem(dt);
        this._updateFalling(dt);
        this._updateExplosion(dt);
        this._updateChainlightning(dt);
        this._updateHookingChain(dt);
        this._updateFireCracker(dt);
        this._updateNewYear(dt);
        this._updateFollow(dt);
        this._updateMotionBlur(dt);
        this._updateFade(dt);
        this._updateUserState(dt);
        this._updateFootHold(dt);
    }
    /** OG: CAnimationDisplayer::NonFieldUpdate (0x45B6C0) — update when not
        on a field (e.g. cash shop, login). Only processes non-field effects. */
    NonFieldUpdate(dt) {
        this._updateEffects(this._oneTime, dt);
        this._updateEffects(this._repeat, dt);
        this._updateReserved(dt);
    }
    /** OG: CAnimationDisplayer::UpdateBeforeUserUpdate (0x4498C0) — update
        effects that need to render before user sprites (e.g. behind-user
        follow effects). Called before the user draw pass. */
    UpdateBeforeUserUpdate(_dt) {
        // Follow effects with relPos=false render behind users
        // In PixiJS we handle z-ordering at the container level instead
    }
    _updateEffects(list, dt) {
        for (let i = list.length - 1; i >= 0; i--) {
            const e = list[i];
            e.elapsed += dt;
            if (e.elapsed >= e.duration) {
                if (e.repeats > 0) {
                    e.repeats--;
                    e.elapsed = 0;
                }
                else {
                    e.ended = true;
                    e.container.removeFromParent();
                    list.splice(i, 1);
                }
            }
        }
    }
    _updateReserved(dt) {
        for (let i = this._reserved.length - 1; i >= 0; i--) {
            const e = this._reserved[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.duration) {
                e.ended = true;
                e.container.removeFromParent();
                this._reserved.splice(i, 1);
            }
        }
    }
    _updateAbsorbItem(dt) {
        for (let i = this._absorbItem.length - 1; i >= 0; i--) {
            const e = this._absorbItem[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.duration) {
                e.ended = true;
                e.container.removeFromParent();
                this._absorbItem.splice(i, 1);
            }
        }
    }
    _updateFalling(dt) {
        for (let i = this._falling.length - 1; i >= 0; i--) {
            const e = this._falling[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.tEnd) {
                e.ended = true;
                e.container.removeFromParent();
                this._falling.splice(i, 1);
            }
        }
    }
    _updateExplosion(dt) {
        for (let i = this._explosion.length - 1; i >= 0; i--) {
            const e = this._explosion[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.tEnd) {
                e.ended = true;
                e.container.removeFromParent();
                this._explosion.splice(i, 1);
                continue;
            }
            // Advance frame based on updateInterval
            if (e.info.updateInterval > 0 && e.elapsed >= e.info.updateNext) {
                e.frameIndex = Math.min(e.frameIndex + 1, e.info.properties.length - 1);
                e.info.updateNext += e.info.updateInterval;
            }
        }
    }
    _updateChainlightning(dt) {
        for (let i = this._chainlightning.length - 1; i >= 0; i--) {
            const e = this._chainlightning[i];
            e.elapsed += dt;
            if (e.info.tEnd > 0 && e.elapsed >= e.info.tEnd) {
                e.ended = true;
                e.container.removeFromParent();
                this._chainlightning.splice(i, 1);
            }
        }
    }
    _updateHookingChain(dt) {
        for (let i = this._hookingChain.length - 1; i >= 0; i--) {
            const e = this._hookingChain[i];
            e.elapsed += dt;
            if (e.info.tEnd2 > 0 && e.elapsed >= e.info.tEnd2) {
                e.ended = true;
                e.container.removeFromParent();
                this._hookingChain.splice(i, 1);
            }
        }
    }
    _updateFireCracker(dt) {
        for (let i = this._fireCracker.length - 1; i >= 0; i--) {
            const e = this._fireCracker[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.tEnd) {
                e.ended = true;
                e.container.removeFromParent();
                this._fireCracker.splice(i, 1);
                continue;
            }
            if (e.info.updateInterval > 0 && e.elapsed >= e.info.updateNext) {
                e.frameIndex = Math.min(e.frameIndex + 1, e.info.properties.length - 1);
                e.info.updateNext += e.info.updateInterval;
            }
        }
    }
    _updateNewYear(dt) {
        for (let i = this._newYear.length - 1; i >= 0; i--) {
            const e = this._newYear[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.tEnd) {
                e.ended = true;
                e.container.removeFromParent();
                this._newYear.splice(i, 1);
                continue;
            }
            if (e.info.updateInterval > 0 && e.elapsed >= e.info.updateNext) {
                e.frameIndex++;
                e.info.updateNext += e.info.updateInterval;
            }
        }
    }
    _updateFollow(dt) {
        for (let i = this._follow.length - 1; i >= 0; i--) {
            const e = this._follow[i];
            e.elapsed += dt;
            if (e.info.tDelay > 0 && e.elapsed < e.info.tDelay)
                continue;
            // Follow effects are persistent until explicitly removed
            // (they track a character's movement). Only removed via Clear/RemoveAll.
        }
    }
    _updateMotionBlur(dt) {
        for (let i = this._motionBlur.length - 1; i >= 0; i--) {
            const e = this._motionBlur[i];
            e.elapsed += dt;
            // Motion blur persists until explicitly removed
            // Layers fade out over time based on alpha decay
            const alpha = Math.max(0, e.info.alpha - (e.elapsed / 1000) * 10);
            e.overlay.alpha = alpha / 255;
            if (alpha <= 0) {
                e.ended = true;
                e.container.removeFromParent();
                this._motionBlur.splice(i, 1);
            }
        }
    }
    _updateFade(dt) {
        for (let i = this._fade.length - 1; i >= 0; i--) {
            const e = this._fade[i];
            e.elapsed += dt;
            if (e.elapsed >= e.info.duration) {
                e.container.alpha = e.info.targetAlpha;
                e.ended = true;
                e.container.removeFromParent();
                this._fade.splice(i, 1);
            }
            else {
                e.container.alpha = e.info.targetAlpha * (e.elapsed / e.info.duration);
            }
        }
    }
    _updateUserState(dt) {
        for (let i = this._userState.length - 1; i >= 0; i--) {
            const e = this._userState[i];
            e.elapsed += dt;
            // UserState cycles through start → repeat → end phases
            // Start plays once, then repeat loops, then end plays once
            if (e.info.nCurEffect === 0 && e.startLayer) {
                // Start phase — play once then switch to repeat
                if (e.elapsed > 500) {
                    e.info.nCurEffect = 1;
                    e.elapsed = 0;
                    if (e.startLayer)
                        e.startLayer.visible = false;
                    if (e.repeatLayer)
                        e.repeatLayer.visible = true;
                }
            }
            else if (e.info.nCurEffect === 1) {
                // Repeat phase — loops indefinitely until removed
            }
            else if (e.info.nCurEffect === 2) {
                // End phase — play once then remove
                if (e.elapsed > 500) {
                    e.ended = true;
                    e.container.removeFromParent();
                    this._userState.splice(i, 1);
                }
            }
        }
    }
    _updateFootHold(dt) {
        for (let i = this._footHold.length - 1; i >= 0; i--) {
            const e = this._footHold[i];
            e.elapsed += dt;
            // FootHold effects persist until explicitly removed
        }
    }
    // ---------------------------------------------------------------------------
    // Register methods — OG: CAnimationDisplayer::Register* (0x44xxxx..0x45xxxx)
    // ---------------------------------------------------------------------------
    /** OG: RegisterOneTimeAnimation (0x444410) */
    RegisterOneTimeAnimation(info, loader) {
        this._playOneTime(info, 'General', loader);
    }
    /** OG: RegisterRepeatAnimation (0x444620) */
    RegisterRepeatAnimation(info, loader) {
        const sprite = this._loadLayer('General', loader);
        const e = new ActiveEffect(info.duration);
        if (sprite) {
            const sp = sprite.NewSprite(false);
            sp.position.set(info.origin.x, info.origin.y);
            e.container.addChild(sp);
        }
        e.container.position.set(info.pos.x, info.pos.y);
        e.container.alpha = info.alpha;
        e.repeats = 999999; // effectively infinite
        this._repeat.push(e);
    }
    /** OG: RegisterAbsorbItemAnimation (0x4446B0) */
    RegisterAbsorbItemAnimation(info, loader) {
        const container = new Container();
        const sprite = this._loadLayer('AbsorbItem', loader);
        if (sprite)
            container.addChild(sprite.NewSprite(false));
        container.position.set(info.x, info.y);
        this._absorbItem.push({ info, container, elapsed: 0, ended: false });
    }
    /** OG: RegisterFadeInOutAnimation (0x444770) */
    RegisterFadeInOutAnimation(characterId, duration, _targetAlpha, _startAlpha, _flags) {
        const container = new Container();
        const g = new Graphics();
        g.rect(-2000, -2000, 4000, 4000).fill({ color: 0x000000, alpha: 1 });
        container.addChild(g);
        container.alpha = 0;
        this._fade.push({
            info: { duration, targetAlpha: _targetAlpha, characterId },
            container, elapsed: 0, ended: false,
        });
    }
    /** OG: RegisterUserStateAnimation (0x444D30) */
    RegisterUserStateAnimation(characterId, startLayer, repeatLayer, endLayer, _flags) {
        const container = new Container();
        if (startLayer) {
            container.addChild(startLayer);
            startLayer.visible = true;
        }
        if (repeatLayer) {
            container.addChild(repeatLayer);
            repeatLayer.visible = false;
        }
        if (endLayer) {
            container.addChild(endLayer);
            endLayer.visible = false;
        }
        this._userState.push({
            info: { characterId, nCurEffect: 0 },
            startLayer, repeatLayer, endLayer,
            container, elapsed: 0, ended: false,
        });
    }
    /** OG: RegisterExplosionAnimation (0x45A1D0) */
    RegisterExplosionAnimation(info, loader) {
        const container = new Container();
        const sprite = this._loadLayer('Explosion', loader);
        if (sprite)
            container.addChild(sprite.NewSprite(false));
        container.position.set(info.x, info.y);
        this._explosion.push({
            info, container, elapsed: 0, frameIndex: 0, ended: false,
        });
    }
    /** OG: RegisterFallingAnimation (0x459B40) */
    RegisterFallingAnimation(info, loader) {
        const container = new Container();
        const sprite = this._loadLayer('Falling', loader);
        if (sprite)
            container.addChild(sprite.NewSprite(false));
        container.position.set(info.x, info.y);
        this._falling.push({ info, container, elapsed: 0, ended: false });
    }
    /** OG: RegisterFireCrackerAnimation (0x45A6E0) */
    RegisterFireCrackerAnimation(info, loader) {
        const container = new Container();
        const sprite = this._loadLayer('FireCracker', loader);
        if (sprite)
            container.addChild(sprite.NewSprite(false));
        container.position.set(info.x, info.y);
        this._fireCracker.push({
            info, container, elapsed: 0, frameIndex: 0, ended: false,
        });
    }
    /** OG: RegisterNewYearAnimation (0x4556F0) */
    RegisterNewYearAnimation(info, loader) {
        const container = new Container();
        const sprite = this._loadLayer('NewYear', loader);
        if (sprite)
            container.addChild(sprite.NewSprite(false));
        container.position.set(info.x, info.y);
        this._newYear.push({
            info, container, elapsed: 0, frameIndex: 0, ended: false,
        });
    }
    /** OG: RegisterFollowAnimation (0x45AC50) */
    RegisterFollowAnimation(info, _loader) {
        const container = new Container();
        if (info.parentLayer)
            container.addChild(info.parentLayer);
        this._follow.push({ info, container, elapsed: 0, ended: false });
    }
    /** OG: RegisterMotionBlurAnimation (0x45AD00) */
    RegisterMotionBlurAnimation(overlay, layers, _delay, _updateInterval, alpha) {
        const container = new Container();
        container.addChild(overlay);
        for (const l of layers)
            container.addChild(l);
        this._motionBlur.push({
            info: { tDelay: _delay, tUpdateInterval: _updateInterval, alpha },
            container, elapsed: 0, overlay, layers, ended: false,
        });
    }
    /** OG: RegisterBulletAnimation (0x455410) */
    RegisterBulletAnimation(_nWeaponItemID, _nBulletDelay, _ptFrom, _ptTo, _pOrigin, _z, _sBallUOL, _nLayer, _nEffect) {
        // Bullet animation — draws a moving sprite from ptFrom to ptTo
        // Simplified: create a container that moves over time
        const container = new Container();
        const g = new Graphics();
        g.circle(0, 0, 4).fill({ color: 0xffffff });
        g.position.set(_ptFrom.x, _ptFrom.y);
        container.addChild(g);
        const e = new ActiveEffect(500);
        e.container.addChild(container);
        this._oneTime.push(e);
    }
    /** OG: RegisterMagicBulletAnimation (0x455570) */
    RegisterMagicBulletAnimation(_nWeaponItemID, _nBulletDelay, _ptFrom, _ptTo, _pOrigin, _z, _sBallUOL, _nAngle) {
        const container = new Container();
        const g = new Graphics();
        g.circle(0, 0, 6).fill({ color: 0x4488ff });
        g.position.set(_ptFrom.x, _ptFrom.y);
        container.addChild(g);
        const e = new ActiveEffect(400);
        e.container.addChild(container);
        this._oneTime.push(e);
    }
    /** OG: RegisterMobBulletAnimation (0x455B10) */
    RegisterMobBulletAnimation(_mobId, _nBulletDelay, _ptFrom, _ptTo, _pOrigin, _z, _nItemId, _sBallUOL, _nAngle) {
        const container = new Container();
        const g = new Graphics();
        g.circle(0, 0, 4).fill({ color: 0xff4444 });
        g.position.set(_ptFrom.x, _ptFrom.y);
        container.addChild(g);
        const e = new ActiveEffect(500);
        e.container.addChild(container);
        this._oneTime.push(e);
    }
    /** OG: RegisterMobSwallowAnimation (0x4559B0) */
    RegisterMobSwallowAnimation(_mobId, _nBulletDelay, _ptFrom, _ptTo, _pOrigin, _z, _pCanvas, _nAngle) {
        const container = new Container();
        const g = new Graphics();
        g.circle(0, 0, 5).fill({ color: 0xff8800 });
        g.position.set(_ptFrom.x, _ptFrom.y);
        container.addChild(g);
        const e = new ActiveEffect(600);
        e.container.addChild(container);
        this._oneTime.push(e);
    }
    /** OG: RegisterChainlightningAnimation (0x45D1B0) */
    RegisterChainlightningAnimation(info) {
        const container = new Container();
        const g = new Graphics();
        // Draw chain lightning line from origin to pt
        g.moveTo(0, 0).lineTo(info.pt.x, info.pt.y).stroke({ color: 0x88ccff, width: 2 });
        container.addChild(g);
        const elapsed = 0;
        const duration = info.tEnd - info.tStart;
        this._chainlightning.push({
            info, container, elapsed, ended: false,
        });
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                const idx = this._chainlightning.findIndex(e => e.info === info);
                if (idx >= 0) {
                    this._chainlightning[idx].ended = true;
                    this._chainlightning[idx].container.removeFromParent();
                    this._chainlightning.splice(idx, 1);
                }
            }, duration);
        }
    }
    /** OG: RegisterHookingChainAnimation (0x45CBD0) */
    RegisterHookingChainAnimation(info) {
        const container = new Container();
        const g = new Graphics();
        // Draw chain from user to target
        g.moveTo(info.ptUser.x, info.ptUser.y)
            .lineTo(info.ptTarget.x, info.ptTarget.y)
            .stroke({ color: 0xcccccc, width: 3 });
        // Draw hook at target
        g.circle(info.ptTarget.x, info.ptTarget.y, 8).fill({ color: 0x888888 });
        container.addChild(g);
        this._hookingChain.push({
            info, container, elapsed: 0, ended: false,
        });
    }
    /** OG: RegisterTeslacoilAnimation (0x45D650) */
    RegisterTeslacoilAnimation(_casterId, _mobId, _ptFrom, _ptTo, _z, _sBallUOL, _delay) {
        const container = new Container();
        const g = new Graphics();
        g.moveTo(_ptFrom.x, _ptFrom.y).lineTo(_ptTo.x, _ptTo.y)
            .stroke({ color: 0xffff44, width: 2 });
        container.addChild(g);
        const e = new ActiveEffect(_delay > 0 ? _delay : 500);
        e.container.addChild(container);
        this._oneTime.push(e);
    }
    /** OG: RegisterPrepareAnimation (0x45B420) — keyed by characterId in m_mPrepare */
    RegisterPrepareAnimation(characterId, layers, keyLayer) {
        // Remove existing prepare for this character
        this.RemovePrepareAnimation(characterId);
        const container = new Container();
        for (const l of layers)
            container.addChild(l);
        container.addChild(keyLayer);
        const e = new ActiveEffect(999999); // persists until removed
        e.container.addChild(container);
        e.repeats = 999999;
        this._prepare.set(characterId, e);
        this._oneTime.push(e);
    }
    /** OG: RegisterReservedAnimation — generalized reserved effect */
    RegisterReservedAnimation(info, _loader) {
        const container = new Container();
        // Load from WZ path if available
        if (this._effectWz && info.uol) {
            const sprite = this._loadLayer(info.uol, _loader);
            if (sprite)
                container.addChild(sprite.NewSprite(false));
        }
        container.position.set(info.x, info.y);
        this._reserved.push({ info, container, elapsed: 0, ended: false });
    }
    // ---------------------------------------------------------------------------
    // Remove methods — OG: CAnimationDisplayer::Remove*
    // ---------------------------------------------------------------------------
    /** OG: RemoveAll (0x4415A0) */
    RemoveAll() {
        this._removeAll(this._oneTime);
        this._removeAll(this._repeat);
        this._removeAll(this._squib);
        this._removeAllReserved();
        this._removeAllAbsorbItem();
        this._removeAllFalling();
        this._removeAllExplosion();
        this._removeAllChainlightning();
        this._removeAllHookingChain();
        this._removeAllFireCracker();
        this._removeAllNewYear();
        this._removeAllFollow();
        this._removeAllMotionBlur();
        this._removeAllFade();
        this._removeAllUserState();
        this._removeAllFootHold();
        this._prepare.clear();
        this._chainlightningMap.clear();
    }
    /** OG: RemoveAllFadeInAnimation (0x441550) */
    RemoveAllFadeInAnimation(characterId) {
        for (let i = this._fade.length - 1; i >= 0; i--) {
            if (this._fade[i].info.characterId === characterId) {
                this._fade[i].container.removeFromParent();
                this._fade.splice(i, 1);
            }
        }
    }
    /** OG: RemovePrepareAnimation (0x441B50) */
    RemovePrepareAnimation(characterId) {
        const existing = this._prepare.get(characterId);
        if (existing) {
            existing.ended = true;
            existing.container.removeFromParent();
            this._prepare.delete(characterId);
            const idx = this._oneTime.indexOf(existing);
            if (idx >= 0)
                this._oneTime.splice(idx, 1);
        }
    }
    /** OG: RemoveTeslacoilAnimation (0x441C00) */
    RemoveTeslacoilAnimation(_characterId) {
        // Tesla coil animations are one-time; removal just cleans up
    }
    _removeAll(list) {
        for (const e of list)
            e.container.removeFromParent();
        list.length = 0;
    }
    _removeAllReserved() {
        for (const e of this._reserved)
            e.container.removeFromParent();
        this._reserved.length = 0;
    }
    _removeAllAbsorbItem() {
        for (const e of this._absorbItem)
            e.container.removeFromParent();
        this._absorbItem.length = 0;
    }
    _removeAllFalling() {
        for (const e of this._falling)
            e.container.removeFromParent();
        this._falling.length = 0;
    }
    _removeAllExplosion() {
        for (const e of this._explosion)
            e.container.removeFromParent();
        this._explosion.length = 0;
    }
    _removeAllChainlightning() {
        for (const e of this._chainlightning)
            e.container.removeFromParent();
        this._chainlightning.length = 0;
    }
    _removeAllHookingChain() {
        for (const e of this._hookingChain)
            e.container.removeFromParent();
        this._hookingChain.length = 0;
    }
    _removeAllFireCracker() {
        for (const e of this._fireCracker)
            e.container.removeFromParent();
        this._fireCracker.length = 0;
    }
    _removeAllNewYear() {
        for (const e of this._newYear)
            e.container.removeFromParent();
        this._newYear.length = 0;
    }
    _removeAllFollow() {
        for (const e of this._follow)
            e.container.removeFromParent();
        this._follow.length = 0;
    }
    _removeAllMotionBlur() {
        for (const e of this._motionBlur)
            e.container.removeFromParent();
        this._motionBlur.length = 0;
    }
    _removeAllFade() {
        for (const e of this._fade)
            e.container.removeFromParent();
        this._fade.length = 0;
    }
    _removeAllUserState() {
        for (const e of this._userState)
            e.container.removeFromParent();
        this._userState.length = 0;
    }
    _removeAllFootHold() {
        for (const e of this._footHold)
            e.container.removeFromParent();
        this._footHold.length = 0;
    }
    // ---------------------------------------------------------------------------
    // Effect_* methods — OG: CAnimationDisplayer::Effect_* (0x43xxxx..0x45xxxx)
    // ---------------------------------------------------------------------------
    /** OG: Effect_General (0x455D10) — generic one-shot WZ effect */
    EffectGeneral(info, path, loader) {
        this._playOneTime(info, path, loader);
    }
    /** OG: Effect_SkillUse (0x459100) — skill cast effect */
    EffectSkillUse(info, skillPath, loader) {
        const path = `SkillUse/${skillPath}`;
        this._playOneTime(info, path, loader);
    }
    /** OG: Effect_SkillPrepare (0x45B840) — skill prepare/charging effect */
    EffectSkillPrepare(info, skillPath, loader) {
        const path = `SkillPrepare/${skillPath}`;
        this._playOneTime(info, path, loader);
    }
    /** OG: Effect_SkillBookUsed (0x4581B0) */
    EffectSkillBookUsed(info, loader) {
        this._playOneTime(info, 'SkillBookUsed', loader);
    }
    /** OG: Effect_Miss (0x449A50) */
    EffectMiss(info, loader) {
        this._playOneTime(info, 'Miss', loader);
    }
    /** OG: Effect_Guard (0x4498E0) */
    EffectGuard(info, loader) {
        this._playOneTime(info, 'Guard', loader);
    }
    /** OG: Effect_Tremble (0x439A70) — camera shake */
    EffectTremble(info) {
        const e = new ActiveEffect(info.duration);
        this._oneTime.push(e);
    }
    /** OG: Effect_HP (0x444EB0) — HP/damage number display */
    EffectHP(type, pos, loader) {
        const path = type === 0 ? 'Damage/Fix' : type === 1 ? 'Damage/' : 'Damage/Miss';
        const sprite = this._loadLayer(path, loader);
        if (!sprite)
            return;
        const e = new ActiveEffect(1500);
        const g = new Graphics();
        g.rect(-15, -30, 30, 60).fill({ color: type === 1 ? 0xff0000 : 0xffff00, alpha: 0.8 });
        e.container.addChild(g);
        e.container.position.set(pos.x, pos.y);
        this._oneTime.push(e);
    }
    /** OG: Effect_BasicFloat (0x446530) — floating text/number */
    EffectBasicFloat(x, y, _canvas) {
        const e = new ActiveEffect(1000);
        const g = new Graphics();
        g.rect(-10, -10, 20, 20).fill({ color: 0xffffff, alpha: 0.5 });
        e.container.addChild(g);
        e.container.position.set(x, y);
        this._oneTime.push(e);
    }
    /** OG: Effect_Squib (0x455F30) — ink splat / hit splat */
    EffectSquib(info, loader) {
        const e = new ActiveEffect(info.duration);
        const g = new Graphics();
        g.circle(0, 0, 8).fill({ color: (info.color.r << 16) | (info.color.g << 8) | info.color.b, alpha: 1 });
        e.container.addChild(g);
        e.container.position.set(info.pos.x, info.pos.y);
        this._oneTime.push(e);
    }
    /** OG: Effect_Catch (0x44FDB0) — catch/pet pickup animation */
    EffectCatch(info, loader) {
        this._playOneTime(info, 'Catch', loader);
    }
    /** OG: Effect_ByItem (0x44F330) — item-specific effect */
    EffectByItem(info, itemId, loader) {
        this._playOneTime(info, `ByItem/${itemId}`, loader);
    }
    /** OG: Effect_Quest (0x459410) — quest completion effect */
    EffectQuest(info, loader) {
        this._playOneTime(info, 'Quest', loader);
    }
    /** OG: Effect_QuestDeliveryItemUse (0x459530) */
    EffectQuestDeliveryItemUse(info, loader) {
        this._playOneTime(info, 'QuestDelivery', loader);
    }
    /** OG: Effect_Cool (0x44A700) — cooldown effect */
    EffectCool(info, loader) {
        this._playOneTime(info, 'Cool', loader);
    }
    /** OG: Effect_BuffItemUse (0x456020) — buff item usage effect */
    EffectBuffItemUse(info, loader) {
        this._playOneTime(info, 'BuffItemUse', loader);
    }
    /** OG: Effect_ItemMake (0x456F80) — item crafting effect */
    EffectItemMake(info, loader) {
        this._playOneTime(info, 'ItemMake', loader);
    }
    /** OG: Effect_ItemUnrelease (0x456360) */
    EffectItemUnrelease(info, loader) {
        this._playOneTime(info, 'ItemUnrelease', loader);
    }
    /** OG: Effect_ItemUpgrade (0x4567F0) */
    EffectItemUpgrade(info, loader) {
        this._playOneTime(info, 'ItemUpgrade', loader);
    }
    /** OG: Effect_CashItemGachapon (0x457F30) */
    EffectCashItemGachapon(info, loader) {
        this._playOneTime(info, 'CashItemGachapon', loader);
    }
    /** OG: Effect_RewardRullet (0x458820) — equipment-tier preview */
    EffectRewardRullet(info, loader) {
        this._playOneTime(info, 'RewardRullet', loader);
    }
    /** OG: Effect_Vega (0x457600) */
    EffectVega(info, loader) {
        this._playOneTime(info, 'Vega', loader);
    }
    /** OG: Effect_ViciousHammer (0x457210) — gold/viceous hammer effect */
    EffectViciousHammer(info, loader) {
        this._playOneTime(info, 'ViciousHammer', loader);
    }
    /** OG: Effect_FullChargedAngerGauge (0x457D00) */
    EffectFullChargedAngerGauge(info, loader) {
        this._playOneTime(info, 'FullChargedAngerGauge', loader);
    }
    /** OG: Effect_ApplyStartDelay (0x449BC0) — delayed start effect */
    EffectApplyStartDelay(info, loader) {
        const sprite = this._loadLayer('General', loader);
        const e = new ActiveEffect(info.duration);
        if (sprite) {
            const sp = sprite.NewSprite(info.flipX);
            sp.position.set(info.origin.x, info.origin.y);
            e.container.addChild(sp);
        }
        e.container.position.set(info.pos.x, info.pos.y);
        // Delay start: don't add to active list until delay expires
        // For simplicity, add immediately (delay handled by caller)
        this._oneTime.push(e);
    }
    /** OG: Effect_Transformed (0x450BA0) — transformation effect */
    EffectTransformed(info, loader) {
        this._playOneTime(info, 'Transformed', loader);
    }
    /** OG: Effect_Reserved (0x45BF90) — generalized reserved effect */
    EffectReserved(info, loader) {
        this._playOneTime(info, 'Reserved', loader);
    }
    /** OG: RegisterSquibAnimation — registers a squib (hit spark) effect */
    RegisterSquibAnimation(_info) {
        // OG: registers squib particle effect at hit position
    }
    /** OG: RegisterFootholdAnimation — registers foothold-related animation */
    RegisterFootholdAnimation(_footholdId, _info) {
        // OG: registers foothold visual effect (e.g. ladder/rope animation)
    }
    // ---------------------------------------------------------------------------
    // Utility methods
    // ---------------------------------------------------------------------------
    /** OG: SetCenterOrigin (0x442E10) */
    SetCenterOrigin(x, y) {
        this._centerOrigin.x = x;
        this._centerOrigin.y = y;
    }
    /** OG: SetLocalFadeLayer (0x442870) */
    SetLocalFadeLayer(width, height) {
        this._localFadeLayer = new Container();
        const g = new Graphics();
        g.rect(0, 0, width, height).fill({ color: 0x000000, alpha: 1 });
        this._localFadeLayer.addChild(g);
        this._localFadeLayer.alpha = 0;
    }
    /** OG: ResetLocalFadeLayer (0x43B6F0) */
    ResetLocalFadeLayer() {
        if (this._localFadeLayer) {
            this._localFadeLayer.removeFromParent();
            this._localFadeLayer = null;
        }
        this._localFadeAlpha = 0;
    }
    /** OG: CalcTotalDelay (0x4474B0) — calculate total animation delay */
    CalcTotalDelay(_loader) {
        // Simplified: return a default delay
        return 100;
    }
    // ---------------------------------------------------------------------------
    // Display accessors for specific animation types
    // ---------------------------------------------------------------------------
    /** Get all active follow effect containers (used by character renderer) */
    GetFollowContainers() {
        return this._follow.map(e => e.container);
    }
    /** Get all active user state containers (used by character renderer) */
    GetUserStateContainers(characterId) {
        return this._userState
            .filter(e => e.info.characterId === characterId)
            .map(e => e.container);
    }
    /** Get active motion blur containers */
    GetMotionBlurContainers() {
        return this._motionBlur.map(e => e.container);
    }
    /** Get active hooking chain containers */
    GetHookingChainContainers() {
        return this._hookingChain.map(e => e.container);
    }
    /** Get active chain lightning containers */
    GetChainLightningContainers() {
        return this._chainlightning.map(e => e.container);
    }
    /** Get active foot hold containers */
    GetFootHoldContainers() {
        return this._footHold.map(e => e.container);
    }
    /** Get local fade layer for field-wide fade effects */
    GetLocalFadeLayer() {
        return this._localFadeLayer;
    }
    /** Get center origin */
    GetCenterOrigin() {
        return { ...this._centerOrigin };
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    _playOneTime(info, path, loader) {
        const sprite = this._loadLayer(path, loader);
        const e = new ActiveEffect(info.duration);
        if (sprite) {
            const sp = sprite.NewSprite(info.flipX);
            sp.position.set(info.origin.x, info.origin.y);
            e.container.addChild(sp);
        }
        e.container.position.set(info.pos.x, info.pos.y);
        this._oneTime.push(e);
    }
    _loadLayer(path, loader) {
        if (!this._effectWz)
            return null;
        const node = this._effectWz.GetItem(`${path}.img`);
        if (!(node instanceof WzProperty))
            return null;
        const sub = node.Get('0');
        if (sub instanceof WzCanvas)
            return loader.Load(sub);
        if (sub instanceof WzProperty) {
            const canvas = sub.Get('0');
            if (canvas instanceof WzCanvas)
                return loader.Load(canvas);
        }
        return null;
    }
    /** Get the total number of active effects across all types */
    get ActiveCount() {
        return this._oneTime.length + this._repeat.length + this._squib.length
            + this._reserved.length + this._absorbItem.length + this._falling.length
            + this._explosion.length + this._chainlightning.length
            + this._hookingChain.length + this._fireCracker.length
            + this._newYear.length + this._follow.length
            + this._motionBlur.length + this._fade.length
            + this._userState.length + this._footHold.length;
    }
    /** Clear all effects */
    Clear() {
        this.RemoveAll();
    }
}
//# sourceMappingURL=AnimationDisplayer.js.map