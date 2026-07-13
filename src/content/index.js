import './styles.css';

console.log('[Mashinted] Content script loaded.');

// Selector for the hydrated feed container on both supported layouts.
import { startObserver } from './observers.js';
import { ensureBrandBlacklistStorageReady } from './storage.js';

ensureBrandBlacklistStorageReady()
    .catch((error) => {
        console.error('[Mashinted] Failed to initialize blacklist storage.', error);
    })
    .finally(() => {
        startObserver();
    });