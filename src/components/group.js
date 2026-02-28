// === Group Component: container for grouped components (MkGroup/DeGroup) ===

class GroupComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('group', x, y, w, h, props);
        this.children = [];
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }

        // Sort children by zIndex ascending, composite into local buffer
        const sorted = [...this.children].sort((a, b) => a.zIndex - b.zIndex);
        for (const child of sorted) {
            const rendered = child.render();
            if (!rendered) continue;
            const offX = child.x - this.x;
            const offY = child.y - this.y;
            for (let r = 0; r < rendered.length; r++) {
                const localRow = offY + r;
                if (localRow < 0 || localRow >= this.h) continue;
                for (let c = 0; c < rendered[r].length; c++) {
                    const localCol = offX + c;
                    if (localCol < 0 || localCol >= this.w) continue;
                    const incoming = rendered[r][c];
                    if (incoming !== ' ') {
                        const existing = chars[localRow][localCol];
                        chars[localRow][localCol] = (existing !== ' ')
                            ? mergeLineChars(existing, incoming)
                            : incoming;
                    }
                }
            }
        }
        return chars;
    }

    getMinSize() { return { minW: 1, minH: 1 }; }

    serialize() {
        const data = super.serialize();
        data.children = this.children.map(c => c.serialize());
        return data;
    }

    applyData(data) {
        super.applyData(data);
        if (data.children && Array.isArray(data.children)) {
            this.children = data.children.map(d => ComponentRegistry.deserialize(d));
        }
    }

    getEditableProps() {
        return [
            { key: 'x', label: 'X', type: 'number' },
            { key: 'y', label: 'Y', type: 'number' },
            { key: 'w', label: 'W', type: 'number' },
            { key: 'h', label: 'H', type: 'number' },
        ];
    }

    // Override setProp to shift children when group position changes
    setProp(key, value) {
        if (key === 'x' || key === 'y') {
            const numVal = parseInt(value, 10) || 0;
            const delta = numVal - this[key];
            this[key] = numVal;
            for (const child of this.children) {
                child[key] += delta;
            }
            return;
        }
        super.setProp(key, value);
    }
}
