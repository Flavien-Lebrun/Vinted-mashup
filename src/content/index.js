import './styles.css';

import { initializeTrashEngine } from './trash-engine.js';
import { startSavedSearchesObserver } from './aggregator.js';
import { ensureBrandBlacklistStorageReady } from './storage.js';
import { startPageTransitionObserver, startObserver } from './observers.js';

import {
    setupCounterWidgetSubscription,
    ensureCounterWidgetMounted
} from './counter-widget.js';

console.log('[Mashinted] Content script loaded.');

let isReactHydrated = false;
let isStorageReady = false;

function tryInitializeApp() {
    if (isReactHydrated && isStorageReady) {
        console.log('[Mashinted] Hydration + Storage ready! Upgrading widget & starting observers.');

        // Upgrades the loading chip created by fast-widget-loader.js to the real interactive widget
        ensureCounterWidgetMounted();

        startObserver();
        startPageTransitionObserver();
        initializeTrashEngine();
    }
}

function checkHydrationInMainWorld() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('checker.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => script.remove();
}

// Listen for signal from public/checker.js
window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data?.type === 'MASHINTED_REACT_HYDRATED') {
        if (isReactHydrated) return;
        console.log('[Mashinted] React hydration confirmed!');
        isReactHydrated = true;
        tryInitializeApp();
    }
});

// Kick off initialization
ensureBrandBlacklistStorageReady()
    .catch((error) => {
        console.error('[Mashinted] Failed to initialize blacklist storage.', error);
    })
    .finally(() => {
        setupCounterWidgetSubscription();
        isStorageReady = true;
        checkHydrationInMainWorld();
        tryInitializeApp();
    });

async function init() {
  await ensureBrandBlacklistStorageReady();

  // Main grid item observers
  startObserver();
  startPageTransitionObserver();

  // Search popover listener
  startSavedSearchesObserver();
}

init();