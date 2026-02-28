// === Dropdown Component: [Option ▾] ===
class DropdownComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('dropdown', x, y, w || 14, h || 1, props);
        this.props.value = props.value || 'Option';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        chars[0][0] = '[';
        chars[0][this.w - 1] = ']';
        // Value text
        const val = this.props.value;
        placeText(chars, 1, 0, val, this.w - 4);
        // Down arrow
        chars[0][this.w - 2] = '▾';
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'value', label: 'Value', type: 'text', propsBased: true },
        ];
    }
}
