export function createConfigModal({ bannedBrands, onAddBrand, onDeleteBrand, onClose, statsSnapshot = new Map() }) {
    if (document.getElementById('vinted-filter-modal-root')) return null;

    // Maintain a local mutable copy of the brand array within the modal's runtime context
    let activeBannedBrands = [...bannedBrands];
    
    // Track brands unchecked during this specific interactive session
    const unselectedBrands = new Set();

    const overlay = document.createElement('div');
    overlay.id = 'vinted-filter-modal-root';
    overlay.className = 'vinted-ext-modal-overlay';

    overlay.innerHTML = `
    <div class="vinted-ext-modal-window">
      <div class="vinted-ext-modal-header">
        <div class="mashinted-search-bar-container">
            <div class="web_ui__InputBar__input-bar">
                <div class="web_ui__InputBar__icon">
                    <span class="web_ui__Icon__icon" style="width:16px; height:16px;">
                        <svg fill="none" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                            <path fill="currentColor" fill-rule="evenodd" d="M13.006 7.003a5.97 5.97 0 0 1-1.265 3.677l2.728 2.729a.75.75 0 0 1-1.06 1.06l-2.73-2.729a5.97 5.97 0 0 1-3.676 1.266 6.004 6.004 0 1 1 6.003-6.003M2.5 7c0 2.481 2.019 4.5 4.5 4.5s4.5-2.019 4.5-4.5S9.481 2.5 7 2.5A4.505 4.505 0 0 0 2.5 7" clip-rule="evenodd"></path>
                        </svg>
                    </span>
                </div>
                <input type="text" class="web_ui__InputBar__value mashinted-filter-search-input" placeholder="Search or block a brand..." autocomplete="off" />
            </div>
        </div>
        <button class="vinted-ext-close-btn" aria-label="Close UI">Close</button>
      </div>
      <div class="vinted-ext-modal-body">
        <div class="vinted-ext-list-title">Brands Blocked</div>
        <ul class="vinted-ext-brands-list pile"></ul>
      </div>
    </div>
  `;

    const closeBtn = overlay.querySelector('.vinted-ext-close-btn');
    const searchInput = overlay.querySelector('.mashinted-filter-search-input');
    const listContainer = overlay.querySelector('.vinted-ext-brands-list');

    let currentSearchQuery = '';

    function renderListItems() {
        listContainer.innerHTML = '';
        const query = currentSearchQuery.trim().toLowerCase();
        
        // Merge list state and alphabetically sort so elements never jump position on toggle
        const allVisibleBrands = [...new Set([...activeBannedBrands, ...unselectedBrands])];
        allVisibleBrands.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        const filteredBrands = allVisibleBrands.filter(brand => 
            brand.toLowerCase().includes(query)
        );

        if (filteredBrands.length === 0 && !query) {
            listContainer.innerHTML = '<div class="vinted-ext-empty-state">No blacklisted brands yet.</div>';
        } else {
            filteredBrands.forEach((brand) => {
                const normalizedName = brand.trim().toLowerCase();
                const currentBlockedCount = statsSnapshot.get(normalizedName) || 0;
                const isChecked = !unselectedBrands.has(brand);

                const li = document.createElement('li');
                li.className = `pile__element ${!isChecked ? 'mashinted-row-muted' : ''}`;
                
                // Using the brand name inside the checkbox ID to preserve unique label association safely
                const safeIdSuffix = normalizedName.replace(/[^a-z0-9]/g, '_');
                
                li.innerHTML = `
                    <div class="mashinted-row-container">
                      <div class="mashinted-row-left-content">
                        ${currentBlockedCount > 0 ? `<span class="mashinted-brand-minimal-counter">+${currentBlockedCount}</span>` : ''}
                        <span class="mashinted-brand-plain-name">${brand}</span>
                      </div>
                      <div class="mashinted-checkbox-wrapper">
                         <label for="brand_chk_${safeIdSuffix}" class="mashinted-custom-checkbox">
                            <input id="brand_chk_${safeIdSuffix}" type="checkbox" ${isChecked ? 'checked' : ''}>
                            <span class="mashinted-checkbox-box"></span>
                         </label>
                      </div>
                    </div>
                `;

                // Handle Checkbox Toggles
                li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
                    if (e.target.checked) {
                        unselectedBrands.delete(brand);
                        onAddBrand(brand);
                    } else {
                        unselectedBrands.add(brand);
                        onDeleteBrand(brand);
                    }
                });

                listContainer.appendChild(li);
            });
        }

        // Quick Add Row Injection Mechanics
        const hasExactMatch = activeBannedBrands.some(b => b.toLowerCase() === query);
        if (query && !hasExactMatch) {
            const addActionLi = document.createElement('li');
            addActionLi.className = 'pile__element mashinted-quick-add-row-wrapper';
            addActionLi.innerHTML = `
                <div class="mashinted-row-container mashinted-quick-add-row">
                  <div class="mashinted-row-left-content">
                    <div class="mashinted-quick-add-meta">
                      <span class="mashinted-brand-plain-name">Block "${currentSearchQuery.trim()}"</span>
                    </div>
                  </div>
                  <button class="mashinted-inline-add-btn" aria-label="Add to blacklist">+</button>
                </div>
            `;

            addActionLi.addEventListener('click', () => {
                const newBrand = currentSearchQuery.trim();
                unselectedBrands.delete(newBrand); 
                onAddBrand(newBrand);
                
                currentSearchQuery = '';
                searchInput.value = '';
                searchInput.focus();
            });

            // Safely appends the row to the very end of the visible elements stack
            listContainer.appendChild(addActionLi);
        }
    }

    // --- Wire Input Handlers ---
    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value;
        renderListItems();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && currentSearchQuery.trim()) {
            const query = currentSearchQuery.trim();
            const hasExactMatch = activeBannedBrands.some(b => b.toLowerCase() === query.toLowerCase());
            
            if (!hasExactMatch) {
                unselectedBrands.delete(query);
                onAddBrand(query);
                currentSearchQuery = '';
                searchInput.value = '';
            }
        }
    });

    const handleClose = () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
            if (onClose) onClose();
        }, 220);
    };

    closeBtn.addEventListener('click', handleClose);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleClose();
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    renderListItems();

    return {
        updateList: (updatedList) => {
            if (Array.isArray(updatedList)) {
                activeBannedBrands = [...updatedList];
            }
            renderListItems();
        }
    };
}