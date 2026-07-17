# Mashup Vinted (Mashinted) — Technical Documentation & Specifications

This document details the functional specifications, technical constraints, UI/UX behaviors, and structural DOM patterns for **Mashup Vinted** (Mashinted), a web extension designed to improve user experience on Vinted by allowing users to blacklist and filter out listings from specific brands.

---

## 1. Project Goal & Overview
The primary objective of **Mashup Vinted** is to filter product listings from the user's view based on a customized blacklist of brands. 

### Core Flow:
*   **Blacklist Storage:** The blacklist is persisted in the browser's `localStorage` as a JSON object containing brand names standardized in **lowercase**.
*   **On-Demand Blacklisting:** A trash icon is injected into every product listing card. Clicking this icon immediately adds the associated brand to the blacklist.
*   **Dynamic Filtering:** Any matching product listing is smoothly hidden from view without breaking the native page flow.

---

## 2. Component Specifications

### 2.1 Product Listings (Behavior)
When a listing is determined to be from a blacklisted brand—either during the initial page load, dynamically via user click on the trash icon, or through real-time updates from management tools—the following behavior applies:
*   **Visual Animation:** The item card must execute a smooth transition animation (e.g., opacity fade out and/or height contraction).
*   **DOM Removal/Hiding:** Once the animation concludes, the listing must be explicitly hidden (`display: none`) or extracted safely from the rendering tree to avoid layout shifts while maintaining compatibility with the host architecture.

### 2.2 Counter Element
A metrics counter is injected into the interface to inform users about the extensions' activity on the current session/page view.

*   **Visual Structure:** 
    *   The **Mashinted** brand logo.
    *   A text string: `Removed: <X>` where `<X>` is a real-time reactive counter showing how many elements have been filtered on the current page.
    *   A trailing **Chevron Icon** pointing downwards by default, indicating expandable/collapsible content.
*   **Interactive State:** Clicking the counter triggers an interactive workflow:
    *   The chevron icon performs a `180-degree` rotation transition.
    *   The Management Modal opens over the view.

### 2.3 Management Modal
The modal acts as the main control center for managing the local blocklist.

#### Top Section (Header)
*   An explicit close button (**X** icon).
*   A section title text node containing the string: `"Brands"`.
*   A functional button labeled `"Remove all"` which clears the blacklist completely from local storage and refreshes state tracking.

#### Center & Search Section
*   **Search/Input Bar:** A quick filter input that allows checking if a brand is already present inside the blacklist.
*   **Inline Insertion:** If the searched brand is not present, the user can press an addition action directly inside or adjacent to the input to explicitly inject that brand string into the blacklist.

#### Main Body (Brand List)
*   Displays the collection of blacklisted brands (filtered dynamically if text exists in the search bar).
*   **Sorting Logic:** Ordered descending by the number of listings removed *on the current page active instance* (`+x` metric counter).
*   **Item Layout:**
    *   **Left Element:** Local count highlight showing `+x` (how many instances of this brand were caught in the active view session).
    *   **Center Element:** Standardized brand title.
    *   **Right Element:** A native or styled checkbox selector (`checked` by default). Unchecking a checkbox schedules the removal of that brand from the blacklist, applying definitively on the next page lifecycle refresh.

---

## 3. Environmental Limits & Architectural Constraints

### React Server Components (RSC) Streaming & SSR
The majority of Vinted's product display feed is delivered via Server-Side Rendering (SSR) and hydrated dynamically via **React Server Components (RSC) Streaming**. 

#### Critical Precautions:
1.  **Avoid React Architecture Collision:** Direct, naïve mutations of the DOM tree can crash React’s internal shadow/virtual reconciliation engine, throwing execution exceptions. Injection routines must be isolated or structured delicately.
2.  **Hybrid Mutation Handling:** The solution requires a `MutationObserver` instance to listen for streaming chunk insertions in the feed grid.
3.  **Backup Integrity Checklist:** React will occasionally reset elements to zero or re-render intact elements when resetting streams. A secondary lookup system or periodic integrity check must confirm that structural elements (like custom trash cans or hidden classes) are re-applied if React wipes out mutated states during client-side hydration.

---

## 4. Design System & CSS Token Mapping

To ensure seamless integration with the host platform, custom nodes must leverage Vinted's native styling parameters or inherit exact color tokens:

| Token / Visual Item | Target Usage | Value Mapping |
| :--- | :--- | :--- |
| **Primary Text** | Body copy, brand names, statistics labels | `color: #565656;` |
| **Accent / Hover Green** | Hover states for active controls, inputs, borders | `rgba(var(--primary-default), 1);` |
| **Search Input Background** | Input background filling | `background-color: rgba(var(--greyscale-level-5), 1);` |
| **Light Selection Green** | Highlighted list elements or hover row items | `background-color: rgba(var(--primary-extra-light), 1);` |

---

## 5. Structural DOM References

The extension must handle two structural patterns for identifying grids and injecting custom buttons depending on whether Vinted generates anonymized or unique item-linked data attributes.

### 5.1 Listing Target Parsing (Extracting Brand Name)

#### Layout Variation A: ID-less structural layout
```html
<div class="homepage-blocks" data-testid="homepage-blocks">
    <div data-testid="grid-item">
        <div>
            <div>
                <div>
                    <div>
                        <div>
                            <div data-testid="feed-item--spacing">
                                <div>
                                    <div data-testid="feed-item--description">
                                        <div>
                                            <div data-testid="feed-item--description--content">
                                                <div>
                                                    <div>
                                                        <p data-testid="feed-item--description-title">Belles Des Pins</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Other grid-item elements --->
</div>
```

#### Layout Variation B: ID-explicit structural layout (`class="feed-grid__item"`)
```html
<div class="homepage-blocks" data-testid="homepage-blocks">
    <div data-testid="grid-item" class="feed-grid__item">
        <div>
            <div>
                <div data-testid="product-item-id-9308625238">
                    <div data-testid="product-item-id-9308625238--summary">
                        <div>
                            <div>
                                <div>
                                    <div>
                                        <div data-testid="product-item-id-9308625238--spacing">
                                            <div>
                                                <div data-testid="product-item-id-9308625238--description">
                                                    <div>
                                                        <div data-testid="product-item-id-9308625238--description--content">
                                                            <div>
                                                                <div>
                                                                    <p data-testid="product-item-id-9308625238--description-title">Belles Des Pins</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Other grid-item elements --->
</div>
```

---

### 5.2 Trash Icon Injection Targets (Siting layout adjacent to Favourites action)

#### Target Position A: ID-less layout
```html
<div class="homepage-blocks" data-testid="homepage-blocks">
    <div data-testid="grid-item">
        <div data-testid="feed-item">
            <div>
                <div>
                    <div data-testid="feed-item--image">
                        <img data-testid="feed-item--image--img">
                    </div>
                </div>
                <a data-testid="feed-item--overlay-link"><div></div></a>
                <div>
                    <button data-testid="feed-item--favourite">
                        <span data-testid="favourite-icon">
                            <svg><path></path></svg>
                        </span>
                    </button>
                    <!-- Inject Trash Icon Adjacent Here -->
                    <span></span>
                </div>
            </div>
        </div>
    </div>
    <!-- Other grid-item elements --->
</div>
```

#### Target Position B: Product ID layout
```html
<div class="homepage-blocks" data-testid="homepage-blocks">
    <div data-testid="grid-item">
        <div>
            <div>
                <div data-testid="product-item-id-9373017791">
                    <div>
                        <div class="new-item-box__image">
                            <div data-testid="product-item-id-9373017791--image"><img></div>
                        </div>
                        <a data-testid="product-item-id-9373017791--overlay-link"><div></div></a>
                        <div>
                            <button data-testid="product-item-id-9373017791--favourite">
                                <span data-testid="favourite-icon">
                                    <svg><path></path></svg>
                                </span>
                                <div></div>
                                <span data-testid="favourite-count-text">5</span>
                            </button>
                            <!-- Inject Trash Icon Adjacent Here -->
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Other grid-item elements --->
</div>
```

---

## 6. Core Structural Element Builders

Use these functional utility definitions inside content script files to generate components safely using native DOM namespaces.

```javascript
/**
 * Generates an SVG node for the item-level deletion action.
 * @returns {SVGElement} Trash icon element.
 */
function createTrashIcon() {
    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    return doc.documentElement;
}

/**
 * Generates an expandable SVG node for the navigation indicator panel.
 * @returns {SVGElement} Dynamic chevron icon element.
 */
function createChevronIcon() {
    const svgString = `
    <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path fill="currentColor" d="M2.47 4.47a.75.75 0 0 1 1.06 0L8 8.94l4.47-4.47a.75.75 0 1 1 1.06 1.06l-5 5a.75.75 0 0 1-1.06 0l-5-5a.75.75 0 0 1 0-1.06"></path>
    </svg>`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    return doc.documentElement;
}
```

---

## 7. Errors encountered during creation of the script

### 7.1 Key specificity discovered while debugging hydration [12-07-2026]

When run on a slower connection, the `MutationObserver` was unable to detect new content being added by the hydration. The observer issue was not mainly about timing. The first successful logs revealed that the script was attaching to a skeleton placeholder container that visually matched the feed but did not contain the hydrated `grid-item` children yet.

#### Final container rule
*   Do not rely on the plain `.homepage-blocks` class alone, because Vinted can render a skeleton version with that class before hydration.
*   Support both real feed layouts by matching either `.feed-grid` or `.homepage-blocks[data-testid="homepage-blocks"]`.
*   This keeps the observer away from the placeholder while still covering both live DOM variants.

#### Debugging path we followed
*   Started with a parent `MutationObserver` on the feed container.
*   Added `grid-item` scanning and title lookup for the `<p>` carrying the listing name.
*   Added retries and deeper mutation handling for late-rendered title text.
*   Added logs to trace where the pipeline stopped.
*   The logs showed the observer was binding to the skeleton container, which led to the selector correction above.

#### Practical takeaway
*   In this page, the hardest part was not finding mutations inside the items.
*   The real issue was ensuring the observer attached only to the hydrated feed container, not to the skeleton wrapper that appears earlier in the page lifecycle.

#### Issues encountered
*   The observer initially attached to a skeleton `.homepage-blocks` wrapper before hydration, so the real `grid-item` nodes were never reached.
*   Watching `attributes` on each item caused a self-trigger loop because the script was mutating its own hide classes and styles.
*   Removing nodes directly let React hydrate them back into the DOM on some pages, so the filter had to switch to a persistent hide flow.
*   The first animation version hid the card visually but left the grid gap behind, so the item had to be finalized with `display: none` after the transition.
*   Heavy mutation logging added extra churn and made the unstable pages worse, so the logging had to be reduced.
*   The root observer needed a safe lifecycle guard so it would not be disconnected through a stale reference on fast-loading pages.

Here is the summarized breakdown of the issues we encountered, their root causes, and the concrete code changes we implemented. You can drop this directly into your existing documentation right beneath your **Issues encountered** list.

---

### 7.2 Core stability and DOM variation issues resolved [17-07-2026]

As the script grew to support custom removal actions and cross-page navigation, several edge cases surfaced involving Vinted’s shifting UI layouts, React's state-management interference, and native browser accessibility layers.

#### Issues encountered & Their fixes

* **Vinted Layout Duplicity (Feed vs. Carousel):**
* *Issue:* Relying entirely on the `[data-testid^="product-item-id-"]` prefix caused the script to miss items rendered inside recommendation carousels or alternative search views that used a `feed-item--image` layout block instead.
* *Fix:* Abstracted the product ID resolution into a centralized multi-strategy `getProductId()` helper. The helper shifts the primary source of truth to the numeric ID inside the permanent item detail link (`a[href^="/items/"]`), falling back to structural data attributes only if the link is missing.


* **Layout Ghosts on Manual Click Depletions:**
* *Issue:* When a user manually deleted an item via our custom trash icon, the element would turn blank but keep its layout dimensions, leaving an awkward empty white gap in the grid. This happened because React unmounted the card’s inner children mid-click, crashing our height measurement calculations and preventing the smooth CSS shrink transition from firing cleanly.
* *Fix:* Introduced a boolean `isManual` flag inside the `blockGridItem()` pipeline. Automated brand sweeps use the smooth CSS max-height transition to keep the scroll index stable, while manual trash icon clicks bypass the animation timers entirely and trigger an instant `display: none !important` hard collapse.


* **Aria-Hidden Ancestor Focus Collision:**
* *Issue:* Clicking the trash icon instantly triggered a browser error complaining that an `aria-hidden="true"` attribute was applied to an ancestor element while focus was actively trapped on our custom inner button.
* *Fix:* Swapped out the brittle manual string mutations of `aria-hidden` in favor of the modern `inert` DOM attribute. We also added an explicit active element focus check that calls `.blur()` to safely step focus away from the item right before layout execution.

---

### 7.3 Core Engine Additions and Enhancements

To implement these structural fixes, we added the following major components and modifications to our source scripts:

#### Multi-Strategy ID Extractor (`grid-item.js` & `trash-engine.js`)

We injected a unified parsing engine to scrape IDs reliably regardless of which AB-tested template Vinted decides to feed the client:

```javascript
function getProductId(gridItem) {
    // Strategy 1: Pull from the immutable product URL path
    const itemLink = gridItem.querySelector('a[href^="/items/"]');
    if (itemLink) {
        const href = itemLink.getAttribute('href');
        const match = href.match(/\/items\/(\d+)/);
        if (match) return match[1];
    }

    // Strategy 2: Standard feed template fallback
    const innerContainer = gridItem.querySelector('[data-testid^="product-item-id-"]');
    if (innerContainer) {
        const match = innerContainer.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }
    
    // Strategy 3: Favorite context signature lookup
    const favBtn = gridItem.querySelector('[data-testid$="--favourite"]');
    if (favBtn) {
        const match = favBtn.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }
    
    return null;
}

```

#### Dual-State Blocking Routine (`grid-item.js`)

We refactored `blockGridItem` to branch depending on whether the block was initiated by background brand scanners or an interactive user action, incorporating native focus blurring and safety flags:

```javascript
function blockGridItem(gridItem, brandName, isManual = false) {
    const productId = getProductId(gridItem);
    
    if (productId) {
        const wasAlreadyBlocked = blockedGridItems.has(productId);
        if (!wasAlreadyBlocked) {
            blockedGridItems.add(productId);
            stopRetryingGridItem(gridItem);
            console.log('[Mashinted] Grid item blocked (ID:', productId, ') due to:', brandName);
        }
    } else {
        blockedGridItems.add(gridItem);
    }

    if (isManual) {
        // Clear active element focus to prevent accessibility engine traps
        if (gridItem.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        // Hard layout collapse to dodge React DOM race-conditions
        gridItem.classList.add(HIDDEN_BY_BLACKLIST_FINAL_CLASS);
        gridItem.style.setProperty('display', 'none', 'important');
        gridItem.style.setProperty('visibility', 'hidden', 'important');
        
        gridItem.inert = true; // Modern alternative to aria-hidden
        gridItem.setAttribute(HIDDEN_BY_BLACKLIST_ATTRIBUTE, 'true');
        stopHideFinalization(gridItem);
    } else {
        enforceHiddenGridItem(gridItem);
    }
}

```

#### Manual Destruction Hook (`trash-engine.js`)

We passed down `true` inside the interactive event handler within the dynamic button injector loop to declare it as a manual event:

```javascript
container.querySelector('button').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // Signals manual interaction to bypass animation calculations and kill the node layout gap instantly
    blockGridItem(gridItem, 'User Deleted', true);
});

```