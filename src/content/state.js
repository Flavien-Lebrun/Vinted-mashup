// Tracks which DOM elements are currently being watched
const observedGridItems = new WeakSet();

// Tracks items that have an active trash icon injected
const activeTrashElements = new WeakSet();

// Tracks items that are scheduled for a deferred injection lock
const scheduledInjections = new WeakSet();

// Tracks items explicitly blocked/hidden by the user or blacklist
const blockedGridItems = new Set();

// Tracks active retry timers to prevent memory leaks
const gridItemRetryTimers = new WeakMap();
const hideFinalizationTimers = new WeakMap();

// Sync stored manual item blocks into memory on boot
function initBlockedItemsFromStorage(storedIds) {
    blockedGridItems.clear();
    if (Array.isArray(storedIds)) {
        storedIds.forEach(id => blockedGridItems.add(id));
    }
}

let currentPageBlockedCount = 0;
let onCountChangeCallback = null;

function incrementPageBlockedCount() {
    currentPageBlockedCount++;
    if (typeof onCountChangeCallback === 'function') {
        onCountChangeCallback(currentPageBlockedCount);
    }
}

function resetPageBlockedCount() {
    currentPageBlockedCount = 0;
    if (typeof onCountChangeCallback === 'function') {
        onCountChangeCallback(currentPageBlockedCount);
    }
}

function subscribeToCountChanges(callback) {
    onCountChangeCallback = callback;
    // Immediate execution ensures the UI matches initial state upon boot
    callback(currentPageBlockedCount);
}

export {
    observedGridItems,
    activeTrashElements,
    scheduledInjections,
    blockedGridItems,
    gridItemRetryTimers,
    hideFinalizationTimers,
    initBlockedItemsFromStorage,
    incrementPageBlockedCount,
    resetPageBlockedCount,
    subscribeToCountChanges,
};