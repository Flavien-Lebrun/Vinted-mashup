# Mashup Vinted (Mashinted) — Technical Documentation & Specifications

This document details the functional specifications, technical constraints, UI/UX behaviors, and structural DOM patterns for **Mashup Vinted** (Mashinted), a web extension designed to improve user experience on Vinted by allowing users to blacklist and filter out listings from specific brands.

---

## 1. Project Goal & Overview

The primary objective of **Mashup Vinted** is to filter product listings from the user's view based on a customized blacklist of brands.

### Core Flow:

* **Blacklist Storage:** The blacklist is persisted in the browser's `localStorage` (or extension storage) as a JSON object containing brand names standardized in **lowercase**.
* **On-Demand Blacklisting:** A trash icon is injected into every product listing card. Clicking this icon immediately adds the associated brand to the blacklist.
* **Dynamic Filtering:** Any matching product listing is smoothly hidden from view without breaking the native page flow or leaving layout gaps.
* **Real-Time Analytics:** The extension tracks both total listings blocked and per-brand session statistics (`statsSnapshot`).

---

## 2. Component Specifications

### 2.1 Product Listings (Behavior)

When a listing is determined to be from a blacklisted brand—either during initial page load, dynamically via user click on the trash icon, or through real-time updates—the following behavior applies:

* **Automated Scanner Hide:** Uses a smooth CSS `max-height` transition and opacity fade-out to prevent abrupt visual jumps while the user scrolls.
* **Manual Trash Click Collapse:** Bypasses animation timers entirely, applying an instant `display: none !important` hard collapse to prevent layout ghost gaps when React unmounts inner children mid-click.
* **Accessibility Safety:** Sets `inert = true` and explicitly calls `.blur()` on active elements to prevent browser focus-trap exceptions on `aria-hidden` ancestors.

---

### 2.2 Hydration Shell & Counter Widget

To eliminate UI flashing and resist React tree reconciliation wipes, the widget uses a **two-phase mounting lifecycle** (`fast-widget.js` -> `counter-widget.js`).

#### Phase 1: Fast Loading Shell (`fast-widget.js`)

* Executes immediately at `document_start` / early DOM load.
* Mounts a non-interactive loading chip to ensure zero layout shift.
* **Primary Spinner:** Contains an inline SVG circle loader using Vinted's primary color token (`rgba(var(--primary-default), 1)`), animated with CSS keyframe rotation (`@keyframes mashinted-spinner-rotate`).
* Displays label: `Blocked: Loading...`

#### Phase 2: Hydration & Exit Transition (`counter-widget.js`)

* **Guaranteed Visibility Window:** Enforces a minimum artificial delay (`MIN_LOADING_TIME_MS = 600ms`) so users can register the loading state even on ultra-fast network calls.
* **Exit / Entry Animation:**
1. Applies `.mashinted-is-exiting` to fade and slide the "Loading..." text up (`translateY(-4px)`).
2. Swaps the DOM payload after a 200ms delay.
3. Triggers `@keyframes mashintedContentEnter` to spring the interactive badge and chevron up into position (`translateY(0)`).


* **Interactive Counter State:**
* Displays real-time count badge derived from `latestCountMemory`.
* Contains a trailing **Chevron Icon** pointing downwards.
* Clicking toggles active states (`web_ui__Chip__activated`, `aria-pressed="true"`) and opens the Management Modal.



---

### 2.3 Management Modal (`createConfigModal`)

The modal acts as the main control center for managing the local blocklist.

#### Top Section (Header)

* **Search Bar:** Filter box with SVG search icon (`.mashinted-filter-search-input`).
* **Close Action:** Close button (`.vinted-ext-close-btn`) that clears overlay state with a 220ms fade-out transition.

#### Main Body (Brand List)

* **State-Connected Counters (`statsSnapshot`):** Receives a live `statsSnapshot` Map/Object from `state.js`. Items rendering in the list check `statsSnapshot.get(normalizedName)` to render a session counter tag (e.g., `+12`) next to the brand name if count `> 0`.
* **Interactive Checkboxes:** Unchecking a brand removes it from `unselectedBrands`, calls `onDeleteBrand(brand)`, and dims the row (`.mashinted-row-muted`). Re-checking invokes `onAddBrand(brand)`.
* **Inline Quick-Add Row:** Typing a search query with no exact match dynamically injects a `"Block <Query>"` row at the bottom with a `+` action button for 1-click addition.

---

## 3. Environmental Limits & Architectural Constraints

### React Server Components (RSC) Streaming & SSR

The majority of Vinted's product display feed is delivered via Server-Side Rendering (SSR) and hydrated dynamically via **React Server Components (RSC) Streaming**.

#### Critical Precautions:

1. **Avoid React Architecture Collision:** Direct DOM deletions crash React's internal shadow/virtual reconciliation engine.
2. **Observer Isolation:** The `MutationObserver` attaches only to hydrated feed containers (`.feed-grid` or `.homepage-blocks[data-testid="homepage-blocks"]`), ignoring raw skeleton containers.
3. **Self-Healing Layout Shell:** The widget presence check runs on `document.getElementById(WIDGET_ID)`. If React wipes the custom DOM node during page transition, the shell instantly snaps back into `document.body` without losing stored count memory (`latestCountMemory`).

---

## 4. Design System & CSS Token Mapping

| Token / Visual Item | Target Usage | Value Mapping |
| --- | --- | --- |
| **Primary Text** | Body copy, brand names, statistics labels | `color: #565656;` |
| **Accent / Hover Green** | Hover states, search borders, spinner stroke | `rgba(var(--primary-default), 1);` |
| **Search Input Background** | Input background filling | `background-color: rgba(var(--greyscale-level-5), 1);` |
| **Light Selection Green** | Highlighted list elements or hover row items | `background-color: rgba(var(--primary-extra-light), 1);` |

---

## 5. Structural DOM References

### 5.1 Multi-Strategy ID Extraction (`getProductId`)

Due to Vinted's continuous layout variation tests, product IDs are resolved through a hierarchical fallback lookup:

```javascript
function getProductId(gridItem) {
    // Strategy 1: Immutable product URL path (Most reliable)
    const itemLink = gridItem.querySelector('a[href^="/items/"]');
    if (itemLink) {
        const href = itemLink.getAttribute('href');
        const match = href.match(/\/items\/(\d+)/);
        if (match) return match[1];
    }

    // Strategy 2: Standard feed template data attribute
    const innerContainer = gridItem.querySelector('[data-testid^="product-item-id-"]');
    if (innerContainer) {
        const match = innerContainer.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }
    
    // Strategy 3: Favorite button context signature lookup
    const favBtn = gridItem.querySelector('[data-testid$="--favourite"]');
    if (favBtn) {
        const match = favBtn.getAttribute('data-testid')?.match(/product-item-id-(\d+)/);
        if (match) return match[1];
    }
    
    return null;
}

```

---

## 6. CSS & Animation Specifications

### 6.1 Primary Spinner Keyframes

```css
/* Color and rotation animation for the loading spinner */
.mashinted-spinner-icon {
    animation: mashinted-spinner-rotate 0.85s linear infinite;
    transform-origin: center center;
    color: rgba(var(--primary-default), 1) !important;
    display: inline-block;
    vertical-align: middle;
}

.mashinted-spinner-circle {
    stroke: currentColor;
}

@keyframes mashinted-spinner-rotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

```

### 6.2 Widget Exit & Entry Transitions

```css
/* Smooth exit transition when swapping out 'Loading...' */
.mashinted-counter-widget-wrapper button .web_ui__Chip__text {
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, opacity;
}

/* Exit state triggered right before DOM swap */
.mashinted-counter-widget-wrapper button.mashinted-is-exiting .web_ui__Chip__text {
    opacity: 0;
    transform: translateY(-4px) scale(0.95);
}

/* Entry animation for active badge content */
.mashinted-counter-widget-wrapper .web_ui__Chip__suffix,
.mashinted-counter-widget-wrapper[data-hydrated="true"] .web_ui__Chip__text {
    animation: mashintedContentEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes mashintedContentEnter {
    0% {
        opacity: 0;
        transform: translateY(4px) scale(0.95);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

```

---

## 7. Complete Issue & Debugging Log

### 7.1 Skeleton Hydration & Selector Specificity [12-07-2026]

* **Issue:** `MutationObserver` attached to raw skeleton placeholders before hydrated `grid-item` nodes were rendered.
* **Fix:** Updated feed container selectors to match `.feed-grid` or `.homepage-blocks[data-testid="homepage-blocks"]`, bypassing skeleton wrappers.

### 7.2 Core Stability & Layout Ghosts [17-07-2026]

* **Layout Ghosts on Manual Delete:** Smooth max-height transitions left white gaps on manual click due to React unmounting inner children mid-click. Fixed by adding `isManual = true` branch that sets `display: none !important` immediately.
* **Aria-Hidden Focus Collision:** Replaced brittle string attribute checks with native `.inert = true` and called `.blur()` on `document.activeElement` before collapse.

### 7.3 Modal Session Stats Disappearance [21-07-2026]

* **Issue:** Modal rendered brand list items without `+X` count badges despite the counter logic detecting blocked items.
* **Root Cause:** `createConfigModal` had `statsSnapshot = new Map()` defaulted, but the instantiation call inside `counter-widget.js` omitted passing the `statsSnapshot` argument.
* **Fix:** Explicitly retrieved live stats map via `getBrandStats()` inside the button click listener and passed `statsSnapshot: currentStats` into `createConfigModal`.