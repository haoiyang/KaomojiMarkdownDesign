// === Search Component: [🔍 Search...    ] ===
class SearchComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('search', x, y, w || 20, h || 1, props);
        this.props.placeholder = props.placeholder || 'Search...';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        chars[0][0] = '[';
        chars[0][this.w - 1] = ']';
        const text = '/ ' + this.props.placeholder;
        placeText(chars, 1, 0, text, this.w - 2);
        return chars;
    }

    getMinSize() { return { minW: 8, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'placeholder', label: 'Placeholder', type: 'text', propsBased: true },
        ];
    }
}
