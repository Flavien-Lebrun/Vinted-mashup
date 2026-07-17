import { getProductId, blockGridItem, extractBrandName } from './grid-item.js';
import { blockedGridItems } from './state.js';
import { addBrand } from './storage.js';

function verifyAndInjectTrashButtons() {
    const favButtons = document.querySelectorAll('[data-testid$="--favourite"]');

    favButtons.forEach((favButton) => {
        const gridItem = favButton.closest('[data-testid="grid-item"]') || favButton.closest('.grid-item');
        if (!gridItem) return;

        // --- ENFORCE BLOCK ON NEW RE-RENDERED NODES ---
        const productId = getProductId(gridItem);
        if (
            (productId && blockedGridItems.has(productId)) || 
            blockedGridItems.has(gridItem)
        ) {
            blockGridItem(gridItem, 'Re-enforced Block', true);
            return;
        }

        const isReady = favButton.getAttribute('aria-pressed') !== null;
        if (!isReady) return;

        const targetParent = favButton.parentElement?.parentElement;
        if (!targetParent) return;

        if (targetParent.querySelector(':scope > .mashinted-trash-container')) return;

        const container = document.createElement('div');
        container.className = 'u-position-absolute u-left u-bottom u-zindex-bump mashinted-trash-container';

        container.innerHTML = `
            <button type="button" class="u-background-white u-flexbox u-align-items-center new-item-box__favourite-icon mashinted-trash-btn" title="Bloquer cette marque">
                <span class="web_ui__Icon__icon web_ui__Icon__greyscale-level-2" style="width: 16px; height: 16px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </span>
            </button>
        `;

        container.querySelector('button').addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const brandName = extractBrandName(gridItem);

            if (brandName) {
                console.log(`[Mashinted] Trash clicked. Adding brand to blacklist: "${brandName}"`);
                
                // 1. Add to chrome.storage.local via your existing storage framework
                await addBrand(brandName); 
                
                // 2. Instantly visually hide this specific item.
                // (Your MutationObserver will catch and hide all other matching brands on the page automatically)
                blockGridItem(gridItem, brandName);
            } else {
                console.warn('[Mashinted] Could not extract brand name from this grid item layout.');
            }
        });

        targetParent.appendChild(container);
    });
}

export function initializeTrashEngine() {
    verifyAndInjectTrashButtons();
    setInterval(() => {
        verifyAndInjectTrashButtons();
    }, 150);
}