// === Toggle Component: [━●] On / [●━] Off ===
class ToggleComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('toggle', x, y, w || 8, h || 1, props);
        this.props.on = props.on !== undefined ? props.on : true;
        this.props.label = props.label || '';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        const toggle = this.props.on ? '[━●]' : '[●━]';
        const stateLabel = this.props.on ? ' On' : ' Off';
        const label = this.props.label ? ` ${this.props.label}` : '';
        placeText(chars, 0, 0, toggle + stateLabel + label, this.w);
        return chars;
    }

    getMinSize() { return { minW: 5, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'label', label: 'Label', type: 'text', propsBased: true },
            { key: 'on', label: 'State', type: 'select', options: ['true', 'false'], propsBased: true },
        ];
    }
}
