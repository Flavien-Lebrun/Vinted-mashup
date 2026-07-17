import { subscribeToCountChanges } from './state.js';

const WIDGET_ID = 'mashinted-counter-widget';
let latestCountMemory = 0;
let isMenuOpen = false;

export function setupCounterWidgetSubscription() {
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

export function ensureCounterWidgetMounted() {
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

    // Only keeping the click listener for your future menu activation!
    nativeButton.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            nativeButton.classList.add('web_ui__Chip__activated');
            nativeButton.setAttribute('aria-pressed', 'true');
        } else {
            nativeButton.classList.remove('web_ui__Chip__activated');
            nativeButton.setAttribute('aria-pressed', 'false');
        }
    });
}