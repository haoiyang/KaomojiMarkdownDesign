// === Card Component: Box with header divider ===
class CardComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('card', x, y, w || 20, h || 8, props);
        this.props.title = props.title || 'Card Title';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        if (this.w >= 3 && this.h >= 4) {
            drawBox(chars, 0, 0, this.w, this.h, this.borderStyle);
            // Title
            placeText(chars, 2, 1, this.props.title, this.w - 4);
            // Divider at row 2
            drawHDivider(chars, 0, this.w, 2, this.borderStyle);
        }
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 4 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'title', label: 'Title', type: 'text', propsBased: true },
        ];
    }
}
