import {
    HOMEPAGE_BLOCKS_SELECTOR,
    ROOT_OBSERVER_DISCONNECT_DELAY_MS,
} from './constants.js';
import { watchGridItemsWithin } from './grid-item.js';

function observeHomepageBlocks(homepageBlocks) {
    watchGridItemsWithin(homepageBlocks);

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) {
                    continue;
                }

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
    let rootObserver = null;

    console.log('[Mashinted] Starting root observer.');

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
            if (rootObserver) {
                rootObserver.disconnect();
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