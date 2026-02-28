// === Separator Component: ──────── ===
class SeparatorComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('separator', x, y, w || 20, h || 1, props);
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const bc = BORDER_CHARS[this.borderStyle] || BORDER_CHARS.single;
        for (let c = 0; c < this.w; c++) {
            chars[0][c] = bc.h;
        }
        return chars;
    }

    getMinSize() { return { minW: 2, minH: 1 }; }
}
