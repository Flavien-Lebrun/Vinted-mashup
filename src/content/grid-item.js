import {
    BRAND_NAME_SELECTOR,
    GRID_ITEM_RETRY_INTERVAL_MS,
    GRID_ITEM_RETRY_LIMIT,
    HIDDEN_BY_BLACKLIST_ACTIVE_CLASS,
    HIDDEN_BY_BLACKLIST_ATTRIBUTE,
    HIDDEN_BY_BLACKLIST_CLASS,
    HIDDEN_BY_BLACKLIST_FINAL_CLASS,
    HIDE_TRANSITION_DURATION_MS,
} from './constants.js';
import { isBlacklistedBrand } from './storage.js';

const observedGridItems = new WeakSet();
const blockedGridItems = new WeakSet();
const gridItemRetryTimers = new WeakMap();
const hideFinalizationTimers = new WeakMap();

function stopRetryingGridItem(gridItem) {
    const timerId = gridItemRetryTimers.get(gridItem);

    if (timerId !== undefined) {
        clearTimeout(timerId);
        gridItemRetryTimers.delete(gridItem);
    }
}

function stopHideFinalization(gridItem) {
    const timerId = hideFinalizationTimers.get(gridItem);

    if (timerId !== undefined) {
        clearTimeout(timerId);
        hideFinalizationTimers.delete(gridItem);
    }
}

function finalizeHiddenGridItem(gridItem) {
    gridItem.classList.add(HIDDEN_BY_BLACKLIST_FINAL_CLASS);
    gridItem.style.setProperty('display', 'none', 'important');
    gridItem.style.setProperty('visibility', 'hidden', 'important');
}

function scheduleHideFinalization(gridItem) {
    stopHideFinalization(gridItem);

    const timerId = window.setTimeout(() => {
        finalizeHiddenGridItem(gridItem);
        hideFinalizationTimers.delete(gridItem);
    }, HIDE_TRANSITION_DURATION_MS + 40);

    hideFinalizationTimers.set(gridItem, timerId);
}

function enforceHiddenGridItem(gridItem) {
    if (gridItem.classList.contains(HIDDEN_BY_BLACKLIST_FINAL_CLASS)) {
        finalizeHiddenGridItem(gridItem);
        return;
    }

    const measuredHeight = Math.max(gridItem.scrollHeight, Math.ceil(gridItem.getBoundingClientRect().height));

    if (measuredHeight > 0) {
        gridItem.style.setProperty('--mashinted-item-max-height', `${measuredHeight}px`);
    }

    gridItem.classList.add(HIDDEN_BY_BLACKLIST_CLASS);
    window.requestAnimationFrame(() => {
        if (!gridItem.isConnected) {
            return;
        }

        gridItem.classList.add(HIDDEN_BY_BLACKLIST_ACTIVE_CLASS);
        scheduleHideFinalization(gridItem);
    });

    gridItem.style.setProperty('pointer-events', 'none', 'important');
    gridItem.setAttribute('aria-hidden', 'true');
    gridItem.setAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE, 'true');
}

function blockGridItem(gridItem, brandName) {
    const wasAlreadyBlocked = blockedGridItems.has(gridItem);

    if (!wasAlreadyBlocked) {
        blockedGridItems.add(gridItem);
        stopRetryingGridItem(gridItem);
        console.log('[Mashinted] Grid item blocked due to blacklisted brand:', brandName);
    }

    enforceHiddenGridItem(gridItem);
}

function logBrandNameWithin(root) {
    const brandNames = root.matches?.(BRAND_NAME_SELECTOR)
        ? [root]
        : root.querySelectorAll?.(BRAND_NAME_SELECTOR) ?? [];

    let foundBrandName = false;

    for (const brandName of brandNames) {
        const text = brandName.textContent?.trim();
        const normalizedBrandName = text?.toLowerCase();

        if (!normalizedBrandName) {
            continue;
        }

        foundBrandName = true;

        if (isBlacklistedBrand(normalizedBrandName)) {
            blockGridItem(root, text);
            return true;
        }
    }

    return foundBrandName;
}

function retryLogBrandNameWithin(gridItem, attempt = 0) {
    if (!gridItem.isConnected || blockedGridItems.has(gridItem)) {
        stopRetryingGridItem(gridItem);
        return;
    }

    if (logBrandNameWithin(gridItem)) {
        stopRetryingGridItem(gridItem);
        return;
    }

    if (attempt >= GRID_ITEM_RETRY_LIMIT) {
        stopRetryingGridItem(gridItem);
        return;
    }

    stopRetryingGridItem(gridItem);

    const timerId = window.setTimeout(() => {
        retryLogBrandNameWithin(gridItem, attempt + 1);
    }, GRID_ITEM_RETRY_INTERVAL_MS);

    gridItemRetryTimers.set(gridItem, timerId);
}

function watchGridItemForBrandName(gridItem) {
    if (observedGridItems.has(gridItem)) {
        return;
    }

    observedGridItems.add(gridItem);
    retryLogBrandNameWithin(gridItem);

    const gridItemObserver = new MutationObserver(() => {
        if (!gridItem.isConnected) {
            stopRetryingGridItem(gridItem);
            stopHideFinalization(gridItem);
            gridItemObserver.disconnect();
            return;
        }

        if (blockedGridItems.has(gridItem) || gridItem.getAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE) === 'true') {
            if (!gridItem.classList.contains(HIDDEN_BY_BLACKLIST_ACTIVE_CLASS)
                || gridItem.getAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE) !== 'true') {
                enforceHiddenGridItem(gridItem);
            }

            return;
        }

        retryLogBrandNameWithin(gridItem);
    });

    gridItemObserver.observe(gridItem, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

function watchGridItemsWithin(root) {
    const gridItems = root.matches?.('[data-testid="grid-item"]')
        ? [root]
        : root.querySelectorAll?.('[data-testid="grid-item"]') ?? [];

    for (const gridItem of gridItems) {
        watchGridItemForBrandName(gridItem);
    }
}

export {
    finalizeHiddenGridItem,
    enforceHiddenGridItem,
    watchGridItemForBrandName,
    watchGridItemsWithin,
};