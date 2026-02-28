// === BaseComponent: abstract class for all components ===

let _componentIdCounter = 0;

class BaseComponent {
    constructor(type, x, y, w, h, props = {}) {
        this.id = ++_componentIdCounter;
        this.type = type;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.zIndex = 0;
        this.visible = true;
        this.locked = false;
        this.name = props.name || `${type}_${this.id}`;
        this.borderStyle = props.borderStyle || 'single';
        this.props = { ...props };
        delete this.props.name;
        delete this.props.borderStyle;
    }

    // Render to a 2D char array (w × h). Override in subclass.
    render() {
        const chars = [];
        for (let r = 0; r < this.h; r++) {
            chars.push(new Array(this.w).fill(' '));
        }
        return chars;
    }

    // Hit test: does (col, row) land on this component?
    contains(col, row) {
        return col >= this.x && col < this.x + this.w &&
               row >= this.y && row < this.y + this.h;
    }

    // Get bounding box
    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    // Get resize handles (8 points around bounding box)
    getHandles() {
        const { x, y, w, h } = this;
        return [
            { col: x,         row: y,         dir: 'nw' },
            { col: x + Math.floor(w/2), row: y, dir: 'n' },
            { col: x + w - 1, row: y,         dir: 'ne' },
            { col: x + w - 1, row: y + Math.floor(h/2), dir: 'e' },
            { col: x + w - 1, row: y + h - 1, dir: 'se' },
            { col: x + Math.floor(w/2), row: y + h - 1, dir: 's' },
            { col: x,         row: y + h - 1, dir: 'sw' },
            { col: x,         row: y + Math.floor(h/2), dir: 'w' },
        ];
    }

    // Check if a point is near a resize handle (returns handle dir or null)
    getHandleAt(col, row) {
        for (const h of this.getHandles()) {
            if (h.col === col && h.row === row) return h.dir;
        }
        return null;
    }

    // Minimum size (override in subclass)
    getMinSize() {
        return { minW: 1, minH: 1 };
    }

    // Serialize for undo/save
    serialize() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h,
            zIndex: this.zIndex,
            visible: this.visible,
            locked: this.locked,
            name: this.name,
            borderStyle: this.borderStyle,
            props: { ...this.props },
        };
    }

    // Restore from serialized data
    static fromData(data) {
        // Override in subclasses via registry
        throw new Error('Use ComponentRegistry.deserialize()');
    }

    // Apply serialized data to this instance
    applyData(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.w = data.w;
        this.h = data.h;
        this.zIndex = data.zIndex;
        this.visible = data.visible !== undefined ? data.visible : true;
        this.locked = data.locked || false;
        this.name = data.name;
        this.borderStyle = data.borderStyle || 'single';
        this.props = { ...data.props };
        // Keep global counter in sync
        if (data.id >= _componentIdCounter) {
            _componentIdCounter = data.id;
        }
    }

    // Clone this component
    clone() {
        const data = this.serialize();
        data.id = ++_componentIdCounter;
        data.name = `${this.type}_${data.id}`;
        data.x += 2;
        data.y += 1;
        if (data.children && Array.isArray(data.children)) {
            for (const child of data.children) {
                child.id = ++_componentIdCounter;
                child.name = `${child.type}_${child.id}`;
                child.x += 2;
                child.y += 1;
            }
        }
        return ComponentRegistry.deserialize(data);
    }

    // Get editable properties (for inspector panel). Override in subclass.
    getEditableProps() {
        return [
            { key: 'x', label: 'X', type: 'number' },
            { key: 'y', label: 'Y', type: 'number' },
            { key: 'w', label: 'W', type: 'number' },
            { key: 'h', label: 'H', type: 'number' },
            { key: 'borderStyle', label: 'Border', type: 'select', options: BORDER_STYLES },
        ];
    }

    // Set a property value (handles both direct and props-based)
    setProp(key, value) {
        if (key in this && typeof this[key] !== 'function') {
            if (typeof this[key] === 'number') value = parseInt(value, 10) || 0;
            this[key] = value;
        } else {
            this.props[key] = value;
        }
    }

    // Get a property value
    getProp(key) {
        if (key in this && typeof this[key] !== 'function') return this[key];
        return this.props[key];
    }
}
