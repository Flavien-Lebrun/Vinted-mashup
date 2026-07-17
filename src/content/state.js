// Tracks which DOM elements are currently being watched
export const observedGridItems = new WeakSet();

// Tracks items that have an active trash icon injected
export const activeTrashElements = new WeakSet();

// Tracks items that are scheduled for a deferred injection lock
export const scheduledInjections = new WeakSet();

// Tracks items explicitly blocked/hidden by the user or blacklist
export const blockedGridItems = new Set();

// Tracks active retry timers to prevent memory leaks
export const gridItemRetryTimers = new WeakMap();
export const hideFinalizationTimers = new WeakMap();