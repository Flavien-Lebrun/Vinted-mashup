// src/content/aggregator.js

import { HOMEPAGE_BLOCKS_SELECTOR } from './constants.js';
import { isBlacklistedBrand, getFavorites, saveFavorite, removeFavorite } from './storage.js';

const TEST_FETCH_URL = 'https://www.vinted.fr/catalog?search_text=bin';

// ============================================================================
// 1. GRID CONTAINER RESOLUTION (Robust with fallbacks)
// ============================================================================

/**
 * Finds the best active grid container or fallback parent on the current page.
 */
function getActiveGridContainer() {
    // 1. Primary explicit grid selectors
    const primaryGrid = document.querySelector('.feed-grid, .catalog-grid, [data-testid="catalog-grid"], [data-testid="grid-container"]');
    if (primaryGrid && primaryGrid.isConnected) {
        return primaryGrid;
    }

    // 2. Main homepage blocks
    const homepageBlocks = document.querySelector(HOMEPAGE_BLOCKS_SELECTOR);
    if (homepageBlocks && homepageBlocks.isConnected) {
        const innerGrid = homepageBlocks.querySelector('.feed-grid, .catalog-grid, [data-testid="grid-container"]');
        if (innerGrid && innerGrid.isConnected) return innerGrid;

        const existingItem = homepageBlocks.querySelector('[data-testid="grid-item"], .feed-grid__item, .web_ui__ItemBox__container');
        if (existingItem && existingItem.parentElement && existingItem.parentElement.isConnected) {
            return existingItem.parentElement;
        }

        return homepageBlocks;
    }

    // 3. Fallback: Find parent container of ANY visible item card on the entire document
    const anyCard = document.querySelector('[data-testid="grid-item"], .feed-grid__item, .web_ui__ItemBox__container');
    if (anyCard && anyCard.parentElement && anyCard.parentElement.isConnected) {
        return anyCard.parentElement;
    }

    // 4. Last resort: append to main layout
    const mainContent = document.querySelector('main, .next-page, #main-content');
    if (mainContent && mainContent.isConnected) {
        return mainContent;
    }

    return null;
}

/**
 * Retries searching for the grid container over ~1.5 seconds.
 */
async function waitForGridContainer(maxRetries = 5, delayMs = 300) {
    for (let i = 0; i < maxRetries; i++) {
        const grid = getActiveGridContainer();
        if (grid) return grid;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
}

// ============================================================================
// 2. CROSS-PAGE FETCHING & PARSING
// ============================================================================

function fetchExternalCatalogHtml(url = TEST_FETCH_URL) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'FETCH_EXTERNAL_PAGE', url }, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (!response || !response.success) {
                return reject(new Error(response?.error || 'Background worker returned no response. Check background script!'));
            }
            resolve(response.html);
        });
    });
}

function parseFirstCatalogItem(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const itemContainer = doc.querySelector('[data-testid="grid-item"], .feed-grid__item, .web_ui__ItemBox__container');

    if (!itemContainer) {
        throw new Error('Could not find any item card in the fetched page HTML.');
    }

    // 1. Brand (e.g., "Jake*s")
    const brandEl = itemContainer.querySelector('[data-testid="feed-item--description-title"]');
    
    // 2. Subtitle / Size / Condition (e.g., "M / 38 / 10 · Bon état")
    const subtitleEl = itemContainer.querySelector('[data-testid="feed-item--description-subtitle"]');

    // 3. Base Item Price (e.g., "8,00 €")
    // Tries specific price text first, then title content, then legacy classes
    const priceEl = itemContainer.querySelector(
        '[data-testid="feed-item--price-text"], .title-content p, .new-item-box__title p, .web_ui__ItemBox__title--price'
    );

    // 4. Total Price including Buyer Protection (e.g., "9,10 €")
    const totalPriceEl = itemContainer.querySelector('[data-testid="total-combined-price"]');

    // 5. Image & Link
    const imgEl = itemContainer.querySelector('[data-testid="feed-item--image--img"], img');
    const linkEl = itemContainer.querySelector('a[href*="/items/"]');

    // 6. Product URL & ID
    const productUrl = linkEl ? linkEl.getAttribute('href') : '';
    const productIdMatch = productUrl.match(/\/items\/(\d+)/);
    const productId = productIdMatch ? productIdMatch[1] : `agg-${Date.now()}`;

    // Extract raw text
    let brandName = brandEl?.textContent?.trim() || '';
    let subtitleText = subtitleEl?.textContent?.trim() || '';
    let itemPrice = priceEl?.textContent?.trim() || '';
    let totalPrice = totalPriceEl?.textContent?.trim() || '';

    // Smart Overlay Title Fallback (if DOM structure is minimal)
    if (linkEl?.getAttribute('title')) {
        const titleAttr = linkEl.getAttribute('title'); 
        if (!brandName) {
            const bMatch = titleAttr.match(/marque:\s*([^,]+)/i);
            if (bMatch) brandName = bMatch[1].trim();
        }
        if (!subtitleText) {
            const tMatch = titleAttr.match(/taille:\s*([^,]+)/i);
            const eMatch = titleAttr.match(/état:\s*([^,]+)/i);
            const size = tMatch ? tMatch[1].trim() : '';
            const status = eMatch ? eMatch[1].trim() : '';
            subtitleText = [size, status].filter(Boolean).join(' · ');
        }
        // Price regex fallback from overlay title/aria if DOM selector failed
        if (!itemPrice) {
            const pMatch = titleAttr.match(/(\d+[.,]\d+\s*€)/);
            if (pMatch) itemPrice = pMatch[1];
        }
    }

    // Fallbacks if one price exists but not the other
    if (!itemPrice && totalPrice) itemPrice = totalPrice;
    if (!totalPrice && itemPrice) totalPrice = itemPrice;

    return {
        id: productId,
        brandName: brandName,
        subtitle: subtitleText,
        price: itemPrice || '—',
        totalPrice: totalPrice || itemPrice || '—',
        imageUrl: imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '',
        itemUrl: productUrl ? (productUrl.startsWith('http') ? productUrl : `https://www.vinted.fr${productUrl}`) : 'https://www.vinted.fr',
    };
}

// ============================================================================
// 3. CARD CREATION & INJECTION
// ============================================================================

/**
 * Creates an item card matching Vinted's exact native DOM node structure.
 */
function createAggregatedItemCard(itemData) {
    const card = document.createElement('div');
    card.setAttribute('data-testid', 'grid-item');
    card.setAttribute('data-mashinted-aggregated', 'true');
    card.className = 'HomeBlocks-module-scss-module__BQ-Taq__homepage-blocks__item HomeBlocks-module-scss-module__BQ-Taq__homepage-blocks__item--one-fifth';

    // Extract brand cleanly
    const brand = itemData.brandName || '';
    const brandHTML = brand 
        ? `<div class="u-flexbox u-justify-content-between">
            <div class="new-item-box__description">
                <p class="web_ui__Text__text web_ui__Text__caption web_ui__Text__left web_ui__Text__truncated" data-testid="feed-item--description-title">${brand}</p>
            </div>
           </div>`
        : '';

    // Subtitle (Size / Condition)
    const subtitle = itemData.subtitle || itemData.title || '';
    const subtitleHTML = subtitle
        ? `<div class="new-item-box__description">
            <p class="web_ui__Text__text web_ui__Text__caption web_ui__Text__left web_ui__Text__truncated" data-testid="feed-item--description-subtitle">${subtitle}</p>
           </div>`
        : '';

    const basePrice = itemData.price || '—';
    const totalPrice = itemData.totalPrice || basePrice;

    card.innerHTML = `
        <div class="new-item-box__container" data-testid="feed-item">
            <div class="u-position-relative u-min-height-none u-flex-auto new-item-box__image-container">
                <div class="new-item-box__image">
                    <div class="web_ui__Image__image web_ui__Image__cover web_ui__Image__portrait web_ui__Image__rounded web_ui__Image__scaled web_ui__Image__ratio" data-testid="feed-item--image" style="background-color: rgb(232, 226, 213);">
                        <img alt="${brand} ${subtitle}" class="web_ui__Image__content" data-testid="feed-item--image--img" src="${itemData.imageUrl}">
                    </div>
                </div>
                <a href="${itemData.itemUrl}" class="new-item-box__overlay new-item-box__overlay--clickable" data-testid="feed-item--overlay-link" title="${brand} ${subtitle}" target="_self" rel="noreferrer">
                    <div></div>
                </a>
                <div class="u-position-absolute u-right u-bottom u-zindex-bump">
                    <button aria-pressed="false" aria-label="Ajouter aux favoris" data-testid="feed-item--favourite" type="button" class="u-background-white u-flexbox u-align-items-center new-item-box__favourite-icon mashinted-fav-btn" data-id="${itemData.id}">
                        <span class="web_ui__Icon__icon web_ui__Icon__greyscale-level-2" data-testid="favourite-icon" style="width: 16px;">
                            <svg fill="none" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" class="fav-icon-svg">
                                <path fill="currentColor" d="M3.149 3.247c-1.03.662-1.462 1.67-1.392 2.79.073 1.146.68 2.425 1.797 3.477 1.608 1.515 3.4 2.968 4.31 3.688.081.064.19.064.271 0 .91-.72 2.702-2.173 4.31-3.688 1.117-1.052 1.725-2.331 1.798-3.476.07-1.12-.363-2.13-1.392-2.79-.576-.371-1.113-.498-1.591-.498-.673 0-1.317.366-1.843.819a6 6 0 0 0-.343.322l-.716.736a.5.5 0 0 1-.717 0l-.716-.736a5 5 0 0 0-.342-.322c-.526-.453-1.17-.819-1.843-.819-.48 0-1.015.127-1.591.497m-.811-1.262c.818-.526 1.636-.735 2.402-.735 1.2 0 2.186.634 2.822 1.182A7 7 0 0 1 8 2.845a7 7 0 0 1 .438-.413c.636-.548 1.621-1.182 2.822-1.182.765 0 1.583.21 2.402.735 1.529.983 2.18 2.535 2.078 4.147-.1 1.586-.92 3.206-2.267 4.474-1.654 1.559-3.485 3.043-4.407 3.772a1.715 1.715 0 0 1-2.132 0c-.922-.729-2.754-2.213-4.408-3.772C1.18 9.338.36 7.718.26 6.132.16 4.52.81 2.968 2.338 1.985"></path>
                            </svg>
                        </span>
                    </button>
                </div>
            </div>
            <div class="new-item-box__summary new-item-box__summary--compact-bottom" data-testid="feed-item--summary">
                <div class="web_ui__Cell__cell web_ui__Cell__tight" role="presentation">
                    <div class="web_ui__Cell__content">
                        <div class="web_ui__Cell__body">
                            <div>
                                <div class="u-flexbox u-align-items-flex-start u-ui-padding-bottom-regular" data-testid="feed-item--spacing">
                                    <div class="u-min-width-none u-flex-grow">
                                        <div class="web_ui__Cell__cell web_ui__Cell__tight" role="presentation" data-testid="feed-item--description">
                                            <div class="web_ui__Cell__content">
                                                <div class="web_ui__Cell__body" data-testid="feed-item--description--content">
                                                    ${brandHTML}
                                                    ${subtitleHTML}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div class="u-position-relative">
                                        <div class="new-item-box__title" data-testid="feed-item--title-container">
                                            <div class="title-content">
                                                <p class="web_ui__Text__text web_ui__Text__caption web_ui__Text__left web_ui__Text__muted" data-testid="feed-item--price-text">${basePrice}</p>
                                            </div>
                                        </div>
                                        <div data-testid="feed-item--breakdown">
                                            <div class="u-flexbox u-align-items-flex-start">
                                                <button class="u-flexbox u-align-items-center u-flex-wrap InlinePrice-module-scss-module__lczz_W__price" tabindex="0" aria-label="${totalPrice} Protection acheteurs incluse" type="button">
                                                    <span class="u-flexbox u-align-items-baseline u-flex-wrap">
                                                        <span class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left web_ui__Text__primary web_ui__Text__underline-none" data-testid="total-combined-price">${totalPrice}</span>
                                                        <span class="web_ui__Spacer__x-small web_ui__Spacer__vertical"></span>
                                                        <span class="web_ui__Text__text web_ui__Text__caption web_ui__Text__left web_ui__Text__primary web_ui__Text__underline-none" tabindex="-1" data-testid="service-fee-included-title">incl.</span>
                                                    </span>
                                                    <span class="web_ui__Spacer__x-small web_ui__Spacer__vertical"></span>
                                                    <span class="web_ui__Icon__icon web_ui__Icon__primary-default" data-testid="service-fee-included-icon" style="width: 12px;">
                                                        <svg fill="none" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                                                            <path fill="currentColor" d="m7.924 4.114.708.707-2.829 2.828-2.121-2.121.707-.707 1.414 1.414z"></path>
                                                            <path fill="currentColor" fill-rule="evenodd" d="M11 6c0 4.2-5 6-5 6s-5-1.8-5-6V1.8L6 0l5 1.8zM2 6V2.503l4-1.44 4 1.44V6c0 1.66-.98 2.902-2.115 3.787A9.4 9.4 0 0 1 6 10.917a9.368 9.368 0 0 1-1.885-1.13C2.981 8.902 2 7.66 2 6m3.66 5.06" clip-rule="evenodd"></path>
                                                        </svg>
                                                    </span>
                                                </button>
                                            </div>
                                            <div class="web_ui__Spacer__small web_ui__Spacer__horizontal"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Favorites Logic
    const favBtn = card.querySelector('.mashinted-fav-btn');
    const favIconSvg = card.querySelector('.fav-icon-svg path');

    getFavorites().then((favorites) => {
        if (favorites[itemData.id]) {
            favIconSvg?.setAttribute('fill', '#C22C2C');
            favBtn.setAttribute('data-favorited', 'true');
        }
    });

    favBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isFav = favBtn.getAttribute('data-favorited') === 'true';
        if (isFav) {
            await removeFavorite(itemData.id);
            favIconSvg?.setAttribute('fill', 'currentColor');
            favBtn.setAttribute('data-favorited', 'false');
        } else {
            await saveFavorite(itemData.id, itemData);
            favIconSvg?.setAttribute('fill', '#C22C2C');
            favBtn.setAttribute('data-favorited', 'true');
        }
    });

    return card;
}

export async function fetchAndInjectAggregatedItem() {
    const targetGrid = await waitForGridContainer();

    if (!targetGrid) {
        throw new Error('Target grid container not found on active page.');
    }

    const rawHtml = await fetchExternalCatalogHtml(TEST_FETCH_URL);
    const itemData = parseFirstCatalogItem(rawHtml);

    if (isBlacklistedBrand(itemData.brandName)) {
        console.log(`[Mashinted Aggregator] Skipped blacklisted brand: "${itemData.brandName}"`);
        throw new Error(`Brand "${itemData.brandName}" is blacklisted.`);
    }

    const cardNode = createAggregatedItemCard(itemData);
    targetGrid.prepend(cardNode); // Prepend to top so it's instantly visible
    console.log('[Mashinted Aggregator] Successfully injected card into target grid:', targetGrid);
    return true;
}

// ============================================================================
// 4. SEARCH POPOVER BUTTON INJECTION
// ============================================================================

function injectSavedSearchButton(savedSearchesContainer) {
    if (savedSearchesContainer.querySelector('#mashinted-aggregator-btn')) {
        return;
    }

    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'u-ui-padding-vertical-regular u-ui-padding-horizontal-large';
    btnWrapper.style.borderBottom = '1px solid var(--color-greyscale-level-4, #e6e6e6)';

    const btn = document.createElement('button');
    btn.id = 'mashinted-aggregator-btn';
    btn.type = 'button';
    btn.className = 'web_ui__Button__button web_ui__Button__primary web_ui__Button__medium web_ui__Button__filled u-fill-width';
    btn.innerHTML = `
        <span class="web_ui__Button__content">
            <span class="web_ui__Button__label">⚡ Injecter l'article Mashinted</span>
        </span>
    `;

    // Prevent popover container from closing or handling click as navigation
    btn.addEventListener('mousedown', (e) => e.stopPropagation());

    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const label = btn.querySelector('.web_ui__Button__label');
        if (label) label.textContent = '⏳ Extraction en cours...';
        btn.disabled = true;

        try {
            await fetchAndInjectAggregatedItem();
            if (label) label.textContent = '✅ Article Injecté !';
        } catch (err) {
            console.error('[Mashinted] Injection failed:', err);
            if (label) label.textContent = `❌ ${err.message || 'Erreur'}`;
        }

        setTimeout(() => {
            if (label) label.textContent = '⚡ Injecter l\'article Mashinted';
            btn.disabled = false;
        }, 2500);
    });

    btnWrapper.appendChild(btn);
    savedSearchesContainer.prepend(btnWrapper);
    console.log('[Mashinted] Successfully injected button into saved-searches popover.');
}

export function startSavedSearchesObserver() {
    const handleMutations = () => {
        const savedSearchesContent = document.querySelector('.saved-searches__content');
        if (savedSearchesContent) {
            injectSavedSearchButton(savedSearchesContent);
        }
    };

    handleMutations();

    const observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}