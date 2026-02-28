// === Text Tool: click to place a textbox and start editing ===

class TextTool extends BaseTool {
    constructor(app) {
        super('text', app);
    }

    onMouseDown(col, row, e) {
        const app = this.app;

        // If clicking on an existing text component, select and edit it
        const hit = app.hitTest(col, row);
        if (hit && hit.props.text !== undefined) {
            app.selectComponent(hit);
            const rect = app.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            app._startInlineEdit(hit, px, py);
            return;
        }

        // Create a new textbox at click position
        app.pushUndo();
        const comp = ComponentRegistry.create('textbox', col, row, {});
        comp.zIndex = app.components.length;
        app.components.push(comp);
        app.selectComponent(comp);
        app.render();

        // Immediately open inline editor
        const rect = app.canvas.getBoundingClientRect();
        const px = comp.x * app.renderer.charWidth + rect.left;
        const py = comp.y * app.renderer.charHeight + rect.top;
        app._startInlineEdit(comp, px - rect.left, py - rect.top);
    }

    getCursor() { return 'text'; }
}
