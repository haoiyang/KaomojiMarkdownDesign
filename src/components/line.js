// === Line Component: any-angle line using Bresenham ===
class LineComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('line', x, y, w || 8, h || 1, props);
        // flipped: false = TL→BR diagonal, true = TR→BL diagonal
        if (props.flipped !== undefined) {
            this.props.flipped = props.flipped;
        } else if (props.orientation === 'vertical') {
            // Backward compat: vertical line
            this.props.flipped = false;
        } else {
            this.props.flipped = false;
        }
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }

        // Determine endpoints within bounding box
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

        return chars;
    }

    getMinSize() { return { minW: 1, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'flipped', label: 'Flip', type: 'select', options: ['false', 'true'], propsBased: true },
        ];
    }
}
