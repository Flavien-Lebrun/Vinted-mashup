const BLACKLIST_STORAGE_KEY = 'bannedBrands';
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

export {
    addBrand,
    BLACKLIST_STORAGE_KEY,
    clearAllBrands,
    ensureBrandBlacklistStorageReady,
    getAllBrands,
    isBlacklistedBrand,
    removeBrand,
};
