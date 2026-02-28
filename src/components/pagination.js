// === Pagination Component: < 1 [2] 3 > ===
class PaginationComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('pagination', x, y, w || 16, h || 1, props);
        this.props.pages = props.pages || 5;
        this.props.current = props.current || 1;
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const total = Math.max(1, this.props.pages);
        const current = Math.max(1, Math.min(total, this.props.current));
        let text = '< ';
        for (let i = 1; i <= total; i++) {
            if (i === current) {
                text += `[${i}] `;
            } else {
                text += `${i} `;
            }
        }
        text += '>';
        placeText(chars, 0, 0, text, this.w);
        return chars;
    }

    getMinSize() { return { minW: 7, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'pages', label: 'Pages', type: 'number', propsBased: true },
            { key: 'current', label: 'Current', type: 'number', propsBased: true },
        ];
    }
}
