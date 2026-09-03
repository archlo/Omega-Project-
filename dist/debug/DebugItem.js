export class DebugItem {
    category;
    name;
    get;
    set;
    getScreenPos = null;
    setFromScreen = null;
    draggable = true;
    constructor(category, name, get, set) {
        this.category = category;
        this.name = name;
        this.get = get;
        this.set = set;
    }
    effectiveScreenPos() {
        return this.getScreenPos ? this.getScreenPos() : this.get();
    }
    applyScreenPos(screen) {
        (this.setFromScreen ?? this.set)(screen);
    }
}
//# sourceMappingURL=DebugItem.js.map