// === Arrow Component: any-angle line with arrowhead ===
class ArrowComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('arrow', x, y, w || 8, h || 1, props);
        // flipped: false = TL→BR, true = TR→BL
        if (props.flipped !== undefined) {
            this.props.flipped = props.flipped;
        } else if (props.orientation === 'vertical') {
            this.props.flipped = false;
        } else {
            this.props.flipped = false;
        }
        // reversed: false = arrowhead at end of Bresenham, true = at start
        if (props.reversed !== undefined) {
            this.props.reversed = props.reversed;
        } else if (props.direction === 'left' || props.direction === 'up') {
            this.props.reversed = true;
        } else {
            this.props.reversed = false;
        }
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }

        let x0, y0, x1, y1;
        if (this.props.flipped) {
            x0 = this.w - 1; y0 = 0;
            x1 = 0; y1 = this.h - 1;
        } else {
            x0 = 0; y0 = 0;
            x1 = this.w - 1; y1 = this.h - 1;
        }

        const points = bresenhamLine(x0, y0, x1, y1);
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.y >= 0 && p.y < this.h && p.x >= 0 && p.x < this.w) {
                chars[p.y][p.x] = lineCharAt(points, i);
            }
        }

        // Place arrowhead
        if (points.length >= 2) {
            const reversed = this.props.reversed;
            const headIdx = reversed ? 0 : points.length - 1;
            const hp = points[headIdx];
            if (hp.y >= 0 && hp.y < this.h && hp.x >= 0 && hp.x < this.w) {
                chars[hp.y][hp.x] = arrowHeadChar(points, !reversed);
            }
        }

        return chars;
    }

    getMinSize() { return { minW: 2, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'flipped', label: 'Flip', type: 'select', options: ['false', 'true'], propsBased: true },
            { key: 'reversed', label: 'Reverse', type: 'select', options: ['false', 'true'], propsBased: true },
        ];
    }
}
