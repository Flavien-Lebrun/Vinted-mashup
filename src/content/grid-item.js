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

import {
    observedGridItems,
    blockedGridItems,
    gridItemRetryTimers,
    hideFinalizationTimers,
} from './state.js';

import { isBlacklistedBrand } from './storage.js';

function extractBrandName(gridItem) {
    const brandNames = gridItem.matches?.(BRAND_NAME_SELECTOR)
        ? [gridItem]
        : gridItem.querySelectorAll?.(BRAND_NAME_SELECTOR) ?? [];

    for (const brandName of brandNames) {
        const text = brandName.textContent?.trim();
        if (text) {
            return text; // Return the raw text immediately upon finding it
        }
    }
    return null;
}

function getProductId(gridItem) {
    // Strategy 1: Find the product anchor link and extract the ID from the href
    const itemLink = gridItem.querySelector('a[href^="/items/"]');
    if (itemLink) {
        const href = itemLink.getAttribute('href'); // e.g., "/items/9373017791-vintage-jacket"
        const match = href.match(/\/items\/(\d+)/);
        if (match) return match[1];
    }

    // Strategy 2: Check testid on the product container layout
    const innerContainer = gridItem.querySelector('[data-testid^="product-item-id-"]');
    if (innerContainer) {
        const match = innerContainer.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }

    // Strategy 3: Check favorite button test ID fallback
    const favBtn = gridItem.querySelector('[data-testid$="--favourite"]');
    if (favBtn) {
        const match = favBtn.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }

    return null;
}

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

    // Safe blur and modern layout locking
    if (gridItem.contains(document.activeElement)) {
        document.activeElement.blur();
    }
    gridItem.style.setProperty('pointer-events', 'none', 'important');
    gridItem.inert = true; // Replaces aria-hidden smoothly
    gridItem.setAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE, 'true');
}

function blockGridItem(gridItem, brandName, isManual = false) {
    const productId = getProductId(gridItem);

    if (productId) {
        const wasAlreadyBlocked = blockedGridItems.has(productId);
        if (!wasAlreadyBlocked) {
            blockedGridItems.add(productId);
            stopRetryingGridItem(gridItem);
            console.log('[Mashinted] Grid item blocked (ID:', productId, ') due to:', brandName);
        }
    } else {
        blockedGridItems.add(gridItem);
    }

    if (isManual) {
        // 1. Remove focus from the active trash button so focus isn't trapped in a hidden element
        if (gridItem.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        // 2. Collapse the layout instantly
        gridItem.classList.add(HIDDEN_BY_BLACKLIST_FINAL_CLASS);
        gridItem.style.setProperty('display', 'none', 'important');
        gridItem.style.setProperty('visibility', 'hidden', 'important');

        // 3. Make the element entirely inert (prevents focus, clicks, and hides from screen readers)
        gridItem.inert = true;
        gridItem.setAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE, 'true');

        stopHideFinalization(gridItem);
    } else {
        // Fall back to the smooth CSS transition for auto-blacklist
        enforceHiddenGridItem(gridItem);
    }
}

function logBrandNameWithin(gridItem) {
    const text = extractBrandName(gridItem);
    if (!text) {
        return false;
    }

    const normalizedBrandName = text.toLowerCase();

    if (isBlacklistedBrand(normalizedBrandName)) {
        blockGridItem(gridItem, text);
        return true;
    }
    return true; // Found a brand name string, even if it wasn't blacklisted yet
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

        const productId = getProductId(gridItem);

        // Keep listing hidden if its product ID or DOM object is in our blacklist
        if (
            (productId && blockedGridItems.has(productId)) ||
            blockedGridItems.has(gridItem) ||
            gridItem.getAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE) === 'true'
        ) {
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
    getProductId,
    finalizeHiddenGridItem,
    enforceHiddenGridItem,
    watchGridItemForBrandName,
    watchGridItemsWithin,
    stopRetryingGridItem,
    stopHideFinalization,
    blockGridItem,
    extractBrandName
};