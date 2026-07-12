# Vinted Mashup

> **A third-party enhancement layer for a cleaner, personalized Vinted experience.**

Vinted Mashup is a web browser extension that seamlessly wraps around the official Vinted website to inject a highly customizable user experience. By intercepting raw data streams and introducing advanced client-side processing, it aims to make shopping clearer, faster, and tailored to you—most notably by stripping away low-quality listings through a powerful **blacklist filtering module**.

---

## 🚀 Key Features

* **UI Layer Hijack:** Seamlessly intercepts Vinted's frontend data to reconstruct a cleaner layout without the clutter.
* **Blacklist Filtering Module:** Say goodbye to garbage items, repetitive commercial sellers, or tags you never want to see again.
* **Advanced Sorting & Personalization:** Custom data processing that gives you control over how listings are filtered and displayed.

## 📖 Project Evolution & History

If you want to follow the step-by-step progression of this extension, every minor milestone, roadblock, and breakthrough is documented in detail.

👉 **Check out the full development journal in [HISTORY.md](https://www.google.com/search?q=./HISTORY.md).**

---

## 🛠️ Tech Stack & Architecture

* **Context:** Chrome/Web Extension (Manifest V3)
* **Core Mechanics:** Network interception (`fetch` monkeypatching), Script Injection (`MAIN` world execution), and custom DOM rebuilding.

For a Vite-based web extension, the `README.md` should be incredibly clear about two things: how to get the project running locally, and **how to load the extension into the browser** (since web extensions don't just run in a standard tab).

Here is a clean, copy-pasteable Markdown template you can drop right into your `README.md`.

---

## 🚀 Getting Started

Follow these steps to set up the project locally and start developing.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (recommended version: 18+ or 20+).

### 1. Install Dependencies
Rebuild the `node_modules` folder by running:
```bash
npm install
```

### 2. Run the Development Server

Start the local development build:

```bash
npm run dev
```

*Note: Vite will compile the extension assets into a temporary or development build folder (usually `dist/`).*

### 3. Load the Extension in Your Browser

Because this is a web extension, you need to load it into your browser manually:

#### For Google Chrome / Brave / Edge:

1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `dist` folder located in the root of this project directory.

#### For Mozilla Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside the `dist` folder.