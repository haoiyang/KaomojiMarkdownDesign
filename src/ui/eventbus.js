// === EventBus: simple pub/sub system ===

class EventBus {
    constructor() {
        this._listeners = {};
    }

    on(event, fn) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(fn);
    }

    off(event, fn) {
        const list = this._listeners[event];
        if (!list) return;
        this._listeners[event] = list.filter(f => f !== fn);
    }

    emit(event, ...args) {
        const list = this._listeners[event];
        if (!list) return;
        for (const fn of list) {
            fn(...args);
        }
    }
}
