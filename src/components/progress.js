// === Progress Component: [████░░] 50% ===
class ProgressComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('progress', x, y, w || 16, h || 1, props);
        this.props.value = props.value !== undefined ? props.value : 50;
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const pct = Math.max(0, Math.min(100, this.props.value));
        const label = ` ${pct}%`;
        const barW = this.w - label.length - 2; // account for [ ] and label
        if (barW < 1) return chars;

        const filled = Math.round(barW * pct / 100);
        let bar = '[';
        for (let i = 0; i < barW; i++) {
            bar += i < filled ? '█' : '░';
        }
        bar += ']' + label;
        placeText(chars, 0, 0, bar, this.w);
        return chars;
    }

    getMinSize() { return { minW: 8, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'value', label: 'Value %', type: 'number', propsBased: true },
        ];
    }
}
