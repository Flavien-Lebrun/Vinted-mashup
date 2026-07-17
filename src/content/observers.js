import {
    HOMEPAGE_BLOCKS_SELECTOR,
    ROOT_OBSERVER_DISCONNECT_DELAY_MS,
} from './constants.js';

import {
    watchGridItemsWithin,
    stopRetryingGridItem,
    stopHideFinalization,
} from './grid-item.js';

function observeHomepageBlocks(homepageBlocks) {
    // 1. Run your brand-name / blacklist checker immediately on load
    watchGridItemsWithin(homepageBlocks);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // Check newly added nodes for brand matching
            for (const node of mutation.addedNodes) {
                if (node instanceof Element) {
                    watchGridItemsWithin(node); 
                }
            }
            // Memory cleanups when React unmounts items
            for (const node of mutation.removedNodes) {
                if (node instanceof Element) {
                    stopRetryingGridItem(node);
                    stopHideFinalization(node);
                }
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
    let rootObserver = null;

    console.log('[Mashinted] Starting root observer.');

    const attachObserver = () => {
        const homepageBlocks = document.querySelector(HOMEPAGE_BLOCKS_SELECTOR);

        if (homepageBlocksObserverAttached && homepageBlocks && homepageBlocks.isConnected) {
            return true;
        }

        if (!homepageBlocks) {
            console.log('[Mashinted] Homepage blocks not found yet.');
            homepageBlocksObserverAttached = false; // Reset if it was destroyed
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
            if (rootObserver) {
                console.log('[Mashinted] Disconnecting root observer.');
                rootObserver.disconnect();
                rootObserver = null;
            }

            rootObserverDisconnectTimer = null;
        }, ROOT_OBSERVER_DISCONNECT_DELAY_MS);

        return true;
    };

    if (attachObserver()) {
        return;
    }

    rootObserver = new MutationObserver(() => {
        if (!attachObserver()) {
            return;
        }
    });

    rootObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

export { startObserver };