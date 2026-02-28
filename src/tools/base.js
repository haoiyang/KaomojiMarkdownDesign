// === BaseTool: interface for all tools ===

class BaseTool {
    constructor(name, app) {
        this.name = name;
        this.app = app;
    }

    // Called when tool is activated
    activate() {}

    // Called when tool is deactivated
    deactivate() {}

    // Mouse event handlers (col/row are grid coordinates)
    onMouseDown(col, row, e) {}
    onMouseMove(col, row, e) {}
    onMouseUp(col, row, e) {}

    // Called each frame to provide overlay data
    getOverlays() { return {}; }

    // Get cursor style
    getCursor() { return 'crosshair'; }
}
