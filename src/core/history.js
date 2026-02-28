// === UndoManager: snapshot-based undo/redo ===

class UndoManager {
    constructor(maxLevels = MAX_UNDO_LEVELS) {
        this.maxLevels = maxLevels;
        this.undoStack = [];
        this.redoStack = [];
    }

    // Save a snapshot (deep clone of component array)
    push(components) {
        const snapshot = this._serialize(components);
        this.undoStack.push(snapshot);
        if (this.undoStack.length > this.maxLevels) {
            this.undoStack.shift();
        }
        // Any new action clears the redo stack
        this.redoStack = [];
    }

    // Undo: pop from undo stack, push current state to redo
    undo(currentComponents) {
        if (this.undoStack.length === 0) return null;
        const currentSnapshot = this._serialize(currentComponents);
        this.redoStack.push(currentSnapshot);
        const snapshot = this.undoStack.pop();
        return this._deserialize(snapshot);
    }

    // Redo: pop from redo stack, push current state to undo
    redo(currentComponents) {
        if (this.redoStack.length === 0) return null;
        const currentSnapshot = this._serialize(currentComponents);
        this.undoStack.push(currentSnapshot);
        const snapshot = this.redoStack.pop();
        return this._deserialize(snapshot);
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }

    _serialize(components) {
        return JSON.stringify(components.map(c => c.serialize()));
    }

    _deserialize(snapshot) {
        const data = JSON.parse(snapshot);
        return data.map(d => ComponentRegistry.deserialize(d));
    }
}
