import './styles.css';

console.log('[Mashinted] Content script loaded.');

import { ensureBrandBlacklistStorageReady } from './storage.js';
import { initializeTrashEngine } from './trash-engine.js';
import { startPageTransitionObserver, startObserver } from './observers.js';
import { setupCounterWidgetSubscription } from './counter-widget.js';

ensureBrandBlacklistStorageReady()
    .catch((error) => {
        console.error('[Mashinted] Failed to initialize blacklist storage.', error);
    })
    .finally(() => {
        setupCounterWidgetSubscription();
        startObserver();
        startPageTransitionObserver();
        initializeTrashEngine();
    });