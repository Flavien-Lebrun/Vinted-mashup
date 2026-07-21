(function () {
  const WIDGET_ID = 'mashinted-counter-widget'; 

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
})();