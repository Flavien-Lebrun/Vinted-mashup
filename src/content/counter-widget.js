// src/content/counter-widget.js
import { subscribeToCountChanges } from './state.js';
import { getAllBrands, addBrand, removeBrand } from './storage.js';
import { createConfigModal } from './modal.js';

const WIDGET_ID = 'mashinted-counter-widget';
let latestCountMemory = 0;
let activeModalRef = null; // Keeps track of the open modal instance

function setupCounterWidgetSubscription() {
    subscribeToCountChanges((newCount) => {
        const isIncrement = newCount > latestCountMemory;
        latestCountMemory = newCount;
        
        const liveWrapper = document.getElementById(WIDGET_ID);
        if (!liveWrapper) return;
        
        const liveBadge = liveWrapper.querySelector('.widget-count-badge');
        if (liveBadge) {
            liveBadge.textContent = newCount;

            if (isIncrement) {
                liveBadge.classList.remove('pulse-bump');
                void liveBadge.offsetWidth; 
                liveBadge.classList.add('pulse-bump');
            }
        }

        if (newCount > 0) {
            liveWrapper.classList.add('is-visible');
        } else {
            liveWrapper.classList.remove('is-visible');
        }
    });
}

function ensureCounterWidgetMounted() {
    if (document.getElementById(WIDGET_ID)) return;

    const wrapper = document.createElement('div');
    wrapper.id = WIDGET_ID;
    wrapper.className = 'mashinted-counter-widget-wrapper';

    wrapper.innerHTML = `
        <div class="u-ui-margin-right-regular u-ui-margin-bottom-regular">
            <div>
                <div class="u-position-relative">
                    <button class="web_ui__Chip__chip web_ui__Chip__outlined web_ui__Chip__round" type="button" aria-pressed="false">
                        <div class="web_ui__Chip__text">
                            <span class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left web_ui__Text__amplified">
                                Blocked:
                            </span>
                        </div>
                        <div class="web_ui__Chip__suffix">
                            <span class="widget-count-badge">${latestCountMemory}</span>
                        </div>
                        <!-- Native Vinted Rotating Chevron Suffix Inserted Below -->
                        <div class="web_ui__Chip__suffix mashinted-widget-chevron-container">
                            <span class="u-flexbox u-align-items-center">
                                <span class="web_ui__Icon__icon" style="width:16px; height:16px; display:inline-flex;">
                                    <svg fill="none" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                                        <path fill="currentColor" d="M2.47 4.47a.75.75 0 0 1 1.06 0L8 8.94l4.47-4.47a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06"></path>
                                    </svg>
                                </span>
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(wrapper);

    if (latestCountMemory > 0) {
        wrapper.classList.add('is-visible');
    }

    const nativeButton = wrapper.querySelector('button');

    nativeButton.addEventListener('click', async () => {
        if (activeModalRef) {
            activeModalRef.destroyModal();
            return;
        }

        nativeButton.classList.add('web_ui__Chip__activated');
        nativeButton.setAttribute('aria-pressed', 'true');

        const currentBannedList = await getAllBrands();

        activeModalRef = createConfigModal({
            bannedBrands: currentBannedList,
            onAddBrand: async (newBrand) => {
                const updatedList = await addBrand(newBrand);
                if (activeModalRef) activeModalRef.updateList(updatedList);
            },
            onDeleteBrand: async (removedBrand) => {
                const updatedList = await removeBrand(removedBrand);
                if (activeModalRef) activeModalRef.updateList(updatedList);
            },
            onClose: () => {
                nativeButton.classList.remove('web_ui__Chip__activated');
                nativeButton.setAttribute('aria-pressed', 'false');
                activeModalRef = null;
            }
        });
    });
}

export {
    setupCounterWidgetSubscription,
    ensureCounterWidgetMounted,
}