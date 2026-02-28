class CircleComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('circle', x, y, w || 12, h || 7, props);
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }

        const w = this.w;
        const h = this.h;

        if (w < 3 || h < 3) return chars;

        const cx = (w - 1) / 2;
        const cy = (h - 1) / 2;
        const rx = (w - 1) / 2;
        const ry = (h - 1) / 2;

        for (let r = 0; r < h; r++) {
            const yNorm = (r - cy) / ry;
            if (Math.abs(yNorm) > 1) continue;

            const xSpan = rx * Math.sqrt(1 - yNorm * yNorm);
            const left = Math.round(cx - xSpan);
            const right = Math.round(cx + xSpan);

            if (r === 0 || r === h - 1) {
                // Top and bottom: use '-'
                for (let c = left; c <= right; c++) {
                    _safeSet(chars, r, c, '-');
                }
            } else {
                // Determine character based on slope
                const yAbove = (r - 0.5 - cy) / ry;
                const yBelow = (r + 0.5 - cy) / ry;
                const xAbove = Math.abs(yAbove) <= 1 ? rx * Math.sqrt(1 - yAbove * yAbove) : 0;
                const xBelow = Math.abs(yBelow) <= 1 ? rx * Math.sqrt(1 - yBelow * yBelow) : 0;

                const slope = xAbove - xBelow;

                let leftChar, rightChar;
                if (Math.abs(slope) < 0.3) {
                    leftChar = '|';
                    rightChar = '|';
                } else if (r < cy) {
                    leftChar = '/';
                    rightChar = '\\';
                } else {
                    leftChar = '\\';
                    rightChar = '/';
                }

                _safeSet(chars, r, left, leftChar);
                _safeSet(chars, r, right, rightChar);
            }
        }

        return chars;
    }

    getMinSize() {
        return { minW: 5, minH: 3 };
    }

    getEditableProps() {
        return super.getEditableProps();
    }
}
