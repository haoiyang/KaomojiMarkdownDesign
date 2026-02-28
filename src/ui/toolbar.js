// === Toolbar: top action buttons ===

class ToolbarUI {
    constructor(app) {
        this.app = app;
        this._bind();
    }

    _bind() {
        document.getElementById('btn-undo').addEventListener('click', () => {
            this.app.bus.emit('action', 'undo');
        });
        document.getElementById('btn-redo').addEventListener('click', () => {
            this.app.bus.emit('action', 'redo');
        });
        document.getElementById('btn-copy-md').addEventListener('click', () => {
            this.app.bus.emit('action', 'copyMarkdown');
        });
        document.getElementById('btn-paste-md').addEventListener('click', () => {
            this.app.bus.emit('action', 'pasteMarkdown');
        });
        document.getElementById('btn-save').addEventListener('click', () => {
            this.app.bus.emit('action', 'save');
        });
        document.getElementById('btn-load').addEventListener('click', () => {
            this.app.bus.emit('action', 'load');
        });
        document.getElementById('btn-new').addEventListener('click', () => {
            this.app.bus.emit('action', 'new');
        });
    }
}
