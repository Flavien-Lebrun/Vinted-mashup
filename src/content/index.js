import './styles.css';

console.log('[Mashinted] Content script loaded.');

// Selector for the hydrated feed container on both supported layouts.
import { startObserver } from './observers.js';

startObserver();