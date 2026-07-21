// src/content/storage.js

const BLACKLIST_STORAGE_KEY = 'bannedBrands';
const FAVORITES_STORAGE_KEY = 'mashinted_favorites'; // Added for cross-page aggregator favorites
const DEFAULT_BANNED_BRANDS = ['h&m', 'shein', 'zara'];

let cachedBannedBrands = [];
let blacklistReadyPromise = null;
let storageListenerRegistered = false;

function normalizeBrandName(brandName) {
    return brandName?.trim().toLowerCase() ?? '';
}

function normalizeBrandList(brandNames) {
    if (!Array.isArray(brandNames)) {
        return [];
    }

    return [...new Set(brandNames.map(normalizeBrandName).filter(Boolean))];
}

function setCachedBrandList(brandNames) {
    cachedBannedBrands = normalizeBrandList(brandNames);
    return [...cachedBannedBrands];
}

function persistBrandList(brandNames) {
    const nextBrandList = setCachedBrandList(brandNames);

    return new Promise((resolve) => {
        chrome.storage.local.set({ [BLACKLIST_STORAGE_KEY]: nextBrandList }, () => {
            resolve([...nextBrandList]);
        });
    });
}

function registerStorageListener() {
    if (storageListenerRegistered) {
        return;
    }

    storageListenerRegistered = true;

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !(BLACKLIST_STORAGE_KEY in changes)) {
            return;
        }

        setCachedBrandList(changes[BLACKLIST_STORAGE_KEY].newValue);
    });
}

function ensureBrandBlacklistStorageReady() {
    if (!blacklistReadyPromise) {
        registerStorageListener();

        blacklistReadyPromise = new Promise((resolve) => {
            chrome.storage.local.get([BLACKLIST_STORAGE_KEY], (result) => {
                const storedBrandList = normalizeBrandList(result[BLACKLIST_STORAGE_KEY]);

                if (storedBrandList.length > 0) {
                    resolve(setCachedBrandList(storedBrandList));
                    return;
                }

                persistBrandList(DEFAULT_BANNED_BRANDS).then(resolve);
            });
        });
    }

    return blacklistReadyPromise;
}

async function getAllBrands() {
    await ensureBrandBlacklistStorageReady();
    return [...cachedBannedBrands];
}

async function addBrand(brandName) {
    const normalizedBrandName = normalizeBrandName(brandName);

    if (!normalizedBrandName) {
        return getAllBrands();
    }

    const brandList = await getAllBrands();

    if (brandList.includes(normalizedBrandName)) {
        return brandList;
    }

    return persistBrandList([...brandList, normalizedBrandName]);
}

async function removeBrand(brandName) {
    const normalizedBrandName = normalizeBrandName(brandName);

    if (!normalizedBrandName) {
        return getAllBrands();
    }

    const brandList = await getAllBrands();

    return persistBrandList(brandList.filter((existingBrandName) => existingBrandName !== normalizedBrandName));
}

async function clearAllBrands() {
    return persistBrandList([]);
}

function isBlacklistedBrand(brandName) {
    return cachedBannedBrands.includes(normalizeBrandName(brandName));
}

// ==========================================
// NEW: Favorites Storage Management
// ==========================================

function getFavorites() {
    return new Promise((resolve) => {
        chrome.storage.local.get([FAVORITES_STORAGE_KEY], (result) => {
            resolve(result[FAVORITES_STORAGE_KEY] || {});
        });
    });
}

async function saveFavorite(productId, favoriteData) {
    const favorites = await getFavorites();
    favorites[productId] = favoriteData;

    return new Promise((resolve) => {
        chrome.storage.local.set({ [FAVORITES_STORAGE_KEY]: favorites }, () => {
            resolve(favorites);
        });
    });
}

async function removeFavorite(productId) {
    const favorites = await getFavorites();
    delete favorites[productId];

    return new Promise((resolve) => {
        chrome.storage.local.set({ [FAVORITES_STORAGE_KEY]: favorites }, () => {
            resolve(favorites);
        });
    });
}

export {
    addBrand,
    BLACKLIST_STORAGE_KEY,
    FAVORITES_STORAGE_KEY,
    clearAllBrands,
    ensureBrandBlacklistStorageReady,
    getAllBrands,
    isBlacklistedBrand,
    removeBrand,
    getFavorites,
    saveFavorite,
    removeFavorite,
};