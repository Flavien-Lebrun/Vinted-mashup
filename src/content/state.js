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

// src/content/state.js

// ... Your existing state declarations (blockedGridItems, observedGridItems, etc.) ...

// 1. Session state storage dictionary mapped to lowercase brand strings
export const brandSessionStats = new Map();

// 2. Pub/Sub registry for brand stats listeners
const brandStatsListeners = new Set();

/**
 * Increments the blocking counter for a specific brand name.
 * @param {string} rawBrandName - The original un-normalized brand text string
 */
export function incrementBrandSessionStat(rawBrandName) {
    if (!rawBrandName) return;
    const normalized = rawBrandName.trim().toLowerCase();
    
    const currentCount = brandSessionStats.get(normalized) || 0;
    brandSessionStats.set(normalized, currentCount + 1);
    
    // Notify all active listeners (e.g., the config modal window)
    notifyBrandStatsListeners();
}

/**
 * Returns a static snapshot clone of the current live stats map
 */
export function getBrandSessionSnapshot() {
    return new Map(brandSessionStats);
}

export function subscribeToBrandStatsChanges(callback) {
    if (typeof callback === 'function') {
        brandStatsListeners.add(callback);
    }
    // Return an unsubscribe function to keep lifecycle hooks clean
    return () => {
        brandStatsListeners.delete(callback);
    };
}

function notifyBrandStatsListeners() {
    const currentSnapshot = getBrandSessionSnapshot();
    for (const listener of brandStatsListeners) {
        try {
            listener(currentSnapshot);
        } catch (err) {
            console.error('[Mashinted] Error updating brand stat listener:', err);
        }
    }
}