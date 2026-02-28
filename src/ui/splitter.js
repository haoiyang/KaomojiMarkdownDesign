// === Splitter: resizable panel borders ===

class PanelSplitter {
    constructor(splitterEl, panelEl, side, options = {}) {
        this._splitter = splitterEl;
        this._panel = panelEl;
        this._side = side; // 'left' or 'right'
        this._minWidth = options.minWidth || 100;
        this._maxWidth = options.maxWidth || 400;
        this._dragging = false;
        this._startX = 0;
        this._startWidth = 0;
        this._onResize = options.onResize || null;
        this._bind();
    }

    _bind() {
        this._splitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this._dragging = true;
            this._startX = e.clientX;
            this._startWidth = this._panel.offsetWidth;
            this._splitter.classList.add('active');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this._dragging) return;
            let delta;
            if (this._side === 'left') {
                delta = e.clientX - this._startX;
            } else {
                delta = this._startX - e.clientX;
            }
            const newWidth = Math.min(this._maxWidth, Math.max(this._minWidth, this._startWidth + delta));
            this._panel.style.width = newWidth + 'px';
            if (this._onResize) this._onResize();
        });

        document.addEventListener('mouseup', () => {
            if (!this._dragging) return;
            this._dragging = false;
            this._splitter.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (this._onResize) this._onResize();
        });
    }
}
