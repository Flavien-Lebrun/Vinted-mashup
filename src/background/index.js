import { ensureBrandBlacklistStorageReady } from '../content/storage.js';

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason !== chrome.runtime.OnInstalledReason.INSTALL) {
        return;
    }

    console.log('🚀 Mashinted installed for the first time! Setting up defaults...');

    ensureBrandBlacklistStorageReady().then((defaults) => {
        console.log('💾 Default banned brands successfully initialized:', defaults);
    });
});