// src/content/counter-widget.js
import { subscribeToCountChanges, getBrandSessionSnapshot } from './state.js';
import { getAllBrands, addBrand, removeBrand } from './storage.js';
import { createConfigModal } from './modal.js';

const WIDGET_ID = 'mashinted-counter-widget';
let latestCountMemory = 0;
let activeModalRef = null; // Keeps track of the open modal instance
let hasInitialScanCompleted = false; // Track if we've received actual data

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
                void liveBadge.offsetWidth; // Trigger reflow for animation restart
                liveBadge.classList.add('pulse-bump');
            }
        }

        // Only allow hiding the widget if initial scanning has actually finished
        if (newCount > 0) {
            liveWrapper.classList.add('is-visible');
        } else if (hasInitialScanCompleted) {
            liveWrapper.classList.remove('is-visible');
        }
    });
}

/**
 * Mounts a lightweight "Loading" placeholder widget early.
 * Safe to call at document_start / initial script load.
 */
function mountLoadingWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    const wrapper = document.createElement('div');
    wrapper.id = WIDGET_ID;
    wrapper.className = 'mashinted-counter-widget-wrapper is-visible';

    wrapper.innerHTML = `
        <div class="u-ui-margin-right-regular u-ui-margin-bottom-regular">
            <div>
                <div class="u-position-relative">
                    <button class="web_ui__Chip__chip web_ui__Chip__outlined web_ui__Chip__round mashinted-widget-loading-btn" type="button" disabled>
                        <div class="web_ui__Chip__text u-flexbox u-align-items-center">
                            <svg class="mashinted-spinner-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <circle 
                                  class="mashinted-spinner-circle" 
                                  cx="12" 
                                  cy="12" 
                                  r="9" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  stroke-width="3" 
                                  stroke-dasharray="28 28"
                                  stroke-linecap="round">
                                </circle>
                            </svg>
                            <span class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left web_ui__Text__amplified u-ui-margin-left-small">
                                Filtering...
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;

    const target = document.body || document.documentElement;
    target.appendChild(wrapper);
}

const MIN_LOADING_TIME_MS = 600; 
const startTime = Date.now();
/**
 * Called once hydration/storage is complete.
 * Upgrades the loading placeholder or creates the interactive widget if missing.
 */
function ensureCounterWidgetMounted() {
    let wrapper = document.getElementById(WIDGET_ID);

    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = WIDGET_ID;
        wrapper.className = 'mashinted-counter-widget-wrapper';
        document.body.appendChild(wrapper);
    }

    wrapper.classList.add('is-visible');

    if (wrapper.dataset.hydrated === 'true') {
        const badge = wrapper.querySelector('.widget-count-badge');
        if (badge) badge.textContent = latestCountMemory;
        return;
    }

    // Calculate how much time passed since script start
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, MIN_LOADING_TIME_MS - elapsedTime);

    // Wait out the remaining delay so the user can appreciate the loading state
    setTimeout(() => {
        const button = wrapper.querySelector('button');

        // 1. Trigger the fade-out exit animation on the inner content
        if (button) {
            button.classList.add('mashinted-is-exiting');
        }

        // 2. Swap the DOM after the 200ms fade-out finishes
        setTimeout(() => {
            wrapper.dataset.hydrated = 'true';

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
                        <div class="web_ui__Chip__suffix web_ui__Text__amplified">
                          <span class="widget-count-badge">${latestCountMemory}</span>
                        </div>
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

            if (latestCountMemory > 0) {
                wrapper.classList.add('is-visible');
            }

            // Attach click handler
            const nativeButton = wrapper.querySelector('button');
            if (nativeButton) {
                nativeButton.addEventListener('click', async () => {
                    if (activeModalRef) {
                        activeModalRef.destroyModal();
                        return;
                    }

                    nativeButton.classList.add('web_ui__Chip__activated');
                    nativeButton.setAttribute('aria-pressed', 'true');

                    const currentBannedList = await getAllBrands();
                    const currentStats = getBrandSessionSnapshot();

                    activeModalRef = createConfigModal({
                        bannedBrands: currentBannedList,
                        statsSnapshot: currentStats,
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
        }, 200); // 200ms exit transition
    }, remainingTime);
}

export {
    setupCounterWidgetSubscription,
    mountLoadingWidget,
    ensureCounterWidgetMounted,
};