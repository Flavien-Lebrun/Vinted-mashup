import './styles.css';

console.log('[Mashinted] Content script loaded.');

import { ensureBrandBlacklistStorageReady } from './storage.js';
import { initializeTrashEngine } from './trash-engine.js';
import { startObserver } from './observers.js';

ensureBrandBlacklistStorageReady()
    .catch((error) => {
        console.error('[Mashinted] Failed to initialize blacklist storage.', error);
    })
    .finally(() => {
        startObserver();
        initializeTrashEngine();
    });