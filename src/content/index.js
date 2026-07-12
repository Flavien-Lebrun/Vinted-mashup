import './styles.css';

console.log('[Mashinted] Content script loaded.');

// Selector for the hydrated feed container on both supported layouts.
const HOMEPAGE_BLOCKS_SELECTOR = '.feed-grid, .homepage-blocks[data-testid="homepage-blocks"]';
// Selector for the individual grid items
const GRID_ITEM_SELECTOR = '[data-testid="grid-item"]';
// Selector for the brand name within a grid item
const BRAND_NAME_SELECTOR = 'p[data-testid*="description-title"]';
const ROOT_OBSERVER_DISCONNECT_DELAY_MS = 90000;
const GRID_ITEM_RETRY_INTERVAL_MS = 100;
const GRID_ITEM_RETRY_LIMIT = 30;

const observedGridItems = new WeakSet();
const observedBrandNames = new WeakSet();
const gridItemRetryTimers = new WeakMap();

function logBrandNameWithin(root) {
    const brandNames = root.matches?.(BRAND_NAME_SELECTOR)
        ? [root]
        : root.querySelectorAll?.(BRAND_NAME_SELECTOR) ?? [];

    let foundBrandName = false;

    for (const brandName of brandNames) {
        const text = brandName.textContent?.trim();

        if (!text || observedBrandNames.has(brandName)) {
            continue;
        }

        observedBrandNames.add(brandName);
        console.log('[Mashinted] Feed item brand name detected:', text);
        foundBrandName = true;
    }

    return foundBrandName;
}

function stopRetryingGridItem(gridItem) {
    const timerId = gridItemRetryTimers.get(gridItem);

    if (timerId !== undefined) {
        clearTimeout(timerId);
        gridItemRetryTimers.delete(gridItem);
    }
}

function retryLogBrandNameWithin(gridItem, attempt = 0) {

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
        retryLogBrandNameWithin(gridItem);
    });

    gridItemObserver.observe(gridItem, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
    });
}

function watchGridItemsWithin(root) {
    const gridItems = root.matches?.(GRID_ITEM_SELECTOR)
        ? [root]
        : root.querySelectorAll?.(GRID_ITEM_SELECTOR) ?? [];

    for (const gridItem of gridItems) {
        watchGridItemForBrandName(gridItem);
    }
}

function observeHomepageBlocks(homepageBlocks) {
    watchGridItemsWithin(homepageBlocks);

    const observer = new MutationObserver((mutations) => {

        for (const mutation of mutations) {
            console.log('[Mashinted] Homepage blocks mutation details.', {
                type: mutation.type,
                addedNodes: mutation.addedNodes.length,
                removedNodes: mutation.removedNodes.length,
                target: mutation.target,
            });

            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) {
                    console.warn('[Mashinted] Unexpected non-element node added to homepage blocks:', node);
                    continue;
                }

                console.log('[Mashinted] Added element inside homepage blocks.', node);

                watchGridItemsWithin(node);
            }
        }
    });

    observer.observe(homepageBlocks, {
        childList: true,
        subtree: true,
    });
}

function startObserver() {
    let rootObserverDisconnectTimer = null;
    let homepageBlocksObserverAttached = false;

    console.log('[Mashinted] Starting root observer.');

    // Function to attach the observer to the homepage blocks when it is loaded and hydrated. Returns true if the observer was attached, false otherwise.
    const attachObserver = () => {
        if (homepageBlocksObserverAttached) {
            return true;
        }

        const homepageBlocks = document.querySelector(HOMEPAGE_BLOCKS_SELECTOR);

        if (!homepageBlocks) {
            console.log('[Mashinted] Homepage blocks not found yet.');
            return false;
        }

        console.log('[Mashinted] Homepage blocks detected. Attaching observer.');

        observeHomepageBlocks(homepageBlocks);
        homepageBlocksObserverAttached = true;

        if (rootObserverDisconnectTimer !== null) {
            clearTimeout(rootObserverDisconnectTimer);
        }

        console.log('[Mashinted] Scheduling root observer disconnection.');

        rootObserverDisconnectTimer = window.setTimeout(() => {
            rootObserver.disconnect();
            rootObserverDisconnectTimer = null;
        }, ROOT_OBSERVER_DISCONNECT_DELAY_MS);

        return true;
    };

    if (attachObserver()) {
        return;
    }

    // Creating a mutation observer to launch the function again on every mutation
    const rootObserver = new MutationObserver(() => {
        if (!attachObserver()) {
            return;
        }
    });

    // Specifying the configuration for the observer
    rootObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

startObserver();