// === Box Component: simple rectangle with border ===
class BoxComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('box', x, y, w, h, props);
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        if (this.w >= 2 && this.h >= 2) {
            drawBox(chars, 0, 0, this.w, this.h, this.borderStyle);
        }
        return chars;
    }

    getMinSize() { return { minW: 3, minH: 3 }; }
}
