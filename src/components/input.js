// === Input Component: [___________] ===
class InputComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('input', x, y, w || 16, h || 1, props);
        this.props.placeholder = props.placeholder || '';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        chars[0][0] = '[';
        chars[0][this.w - 1] = ']';
        const placeholder = this.props.placeholder;
        if (placeholder) {
            placeText(chars, 1, 0, placeholder, this.w - 2);
        } else {
            for (let c = 1; c < this.w - 1; c++) {
                chars[0][c] = '_';
            }
        }
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'placeholder', label: 'Placeholder', type: 'text', propsBased: true },
        ];
    }
}
