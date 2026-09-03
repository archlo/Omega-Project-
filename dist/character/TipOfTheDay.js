import { WzProperty } from '../wz/WzProperty.js';
// OG: CTips::Init/CTips::GetTip (decompile 0x7609a0/0x760560), called every
// tick from CWvsContext::Update (xref-confirmed). TODO_AUDIT.md
// Eighty-fourth pass flagged this as WZ-unverified/StringPool-blocked —
// re-checked while waterfalling through implementation by opening the real
// `Etc/Tips.img` directly: it's a fully literal table (`info/0..9` =
// {all, interval, levelMin, levelMax, job?, tip}, plus flat per-group tip
// string lists like `novice`/`novice2`/...), NOT StringPool-indirected like
// `MonsterBookStr` — only the *runtime resolution path* in `CTips::Init`
// used StringPool, not the WZ data shape itself.
//
// Simplifications (documented, not guessed): the OG's `job` bitmask field
// and the `all`-percent skip-roll both feed a StringPool-resolved message
// *template* selection (`CTips::GetTip`'s 0x740/0x741 strings) whose exact
// semantics aren't recoverable without the string table — dropped here,
// same as the equip-set-tooltip precedent. Every entry is shown regardless
// of job, and the raw tip text is displayed with no template wrapper.
export class TipOfTheDay {
    _entries = [];
    _groups = new Map();
    _lastShownAt = -Infinity;
    _activeInterval = 0;
    Load(etcWz) {
        const tips = etcWz?.GetItem('Tips.img');
        const root = tips instanceof WzProperty ? tips : null;
        if (!root)
            return;
        const info = root.Get('info');
        if (info instanceof WzProperty) {
            for (const entry of Object.values(info.Items)) {
                if (!(entry instanceof WzProperty))
                    continue;
                const group = entry.Get('tip');
                if (typeof group !== 'string')
                    continue;
                this._entries.push({
                    levelMin: Number(entry.Get('levelMin') ?? 1),
                    levelMax: Number(entry.Get('levelMax') ?? 999),
                    interval: Number(entry.Get('interval') ?? 30000),
                    jobMask: Number(entry.Get('job') ?? 0),
                    group,
                });
            }
        }
        for (const groupName of new Set(this._entries.map((e) => e.group))) {
            const groupNode = root.Get(groupName);
            if (!(groupNode instanceof WzProperty))
                continue;
            const lines = Object.values(groupNode.Items).filter((v) => typeof v === 'string');
            this._groups.set(groupName, lines);
        }
    }
    /** Returns a tip line if one is due for the given level and job, else null. */
    GetTip(level, job, nowMs) {
        const entry = this._entries.find((e) => level >= e.levelMin && level <= e.levelMax &&
            (e.jobMask === 0 || job >= 1 && (e.jobMask & (1 << (job - 1))) !== 0));
        if (!entry)
            return null;
        if (nowMs - this._lastShownAt < this._activeInterval)
            return null;
        const lines = this._groups.get(entry.group);
        if (!lines || lines.length === 0)
            return null;
        this._lastShownAt = nowMs;
        this._activeInterval = entry.interval;
        return lines[Math.floor(Math.random() * lines.length)] ?? null;
    }
}
//# sourceMappingURL=TipOfTheDay.js.map