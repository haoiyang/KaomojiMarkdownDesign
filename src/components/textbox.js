// === TextBox Component ===
class TextBoxComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('textbox', x, y, w, h, props);
        this.props.text = props.text || 'Text';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const lines = this.props.text.split('\n');
        for (let r = 0; r < Math.min(lines.length, this.h); r++) {
            placeText(chars, 0, r, lines[r], this.w);
        }
        return chars;
    }

    getMinSize() { return { minW: 1, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'text', label: 'Text', type: 'text', propsBased: true },
        ];
    }
}
