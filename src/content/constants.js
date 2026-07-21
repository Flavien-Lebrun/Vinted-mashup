export const HOMEPAGE_BLOCKS_SELECTOR = [
    '.feed-grid',
    '.catalog-grid',
    '[data-testid="homepage-blocks"]',
    '[data-testid="catalog-grid"]',
    '[data-testid="grid-container"]',
    '.homepage-blocks',
    '.items-grid',
    'main' // Ultimate fallback: target main content area if custom containers fail
].join(', ');
export const BRAND_NAME_SELECTOR = 'p[data-testid*="description-title"]';
export const HIDDEN_BY_BLACKLIST_ATTRIBUTE = 'data-mashinted-hidden-by-blacklist';
export const HIDDEN_BY_BLACKLIST_CLASS = 'mashinted-hidden-by-blacklist';
export const HIDDEN_BY_BLACKLIST_ACTIVE_CLASS = 'mashinted-hidden-by-blacklist-active';
export const HIDDEN_BY_BLACKLIST_FINAL_CLASS = 'mashinted-hidden-by-blacklist-final';
export const ROOT_OBSERVER_DISCONNECT_DELAY_MS = 5000;
export const GRID_ITEM_RETRY_INTERVAL_MS = 100;
export const GRID_ITEM_RETRY_LIMIT = 30;
export const HIDE_TRANSITION_DURATION_MS = 220;