// === StatusBar: bottom info bar ===

class StatusBarUI {
    constructor(app) {
        this.app = app;
        this._pos = document.getElementById('status-pos');
        this._grid = document.getElementById('status-grid');
        this._count = document.getElementById('status-count');
        this._tool = document.getElementById('status-tool');
    }

    updatePos(col, row) {
        this._pos.textContent = `Ln ${row + 1}, Col ${col + 1}`;
    }

    updateGrid(cols, rows) {
        this._grid.textContent = `${cols}×${rows}`;
    }

    updateCount(n) {
        this._count.textContent = `Components: ${n}`;
    }

    updateTool(name) {
        this._tool.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }
}
