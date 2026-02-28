// === NavBar Component: Logo Link Link [Action] ===
class NavBarComponent extends BaseComponent {
    constructor(x, y, w, h, props = {}) {
        super('navbar', x, y, w || 40, h || 1, props);
        this.props.logo = props.logo || 'Logo';
        this.props.links = props.links || ['Home', 'About', 'Contact'];
        this.props.action = props.action || 'Sign In';
    }

    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        let col = 0;
        // Logo
        placeText(chars, col, 0, this.props.logo, this.w);
        col += this.props.logo.length + 2;
        // Links
        for (const link of this.props.links) {
            if (col >= this.w) break;
            placeText(chars, col, 0, link, this.w - col);
            col += link.length + 2;
        }
        // Action button aligned right
        const actionText = `[${this.props.action}]`;
        const actionStart = this.w - actionText.length;
        if (actionStart > col) {
            placeText(chars, actionStart, 0, actionText, actionText.length);
        }
        return chars;
    }

    getMinSize() { return { minW: 10, minH: 1 }; }

    getEditableProps() {
        return [
            ...super.getEditableProps(),
            { key: 'logo', label: 'Logo', type: 'text', propsBased: true },
            { key: 'action', label: 'Action', type: 'text', propsBased: true },
        ];
    }
}
