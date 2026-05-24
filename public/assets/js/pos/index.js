// POS/index.js - Main Entry Point
import {
    initGlobalState
} from './core/init.js';

// Simple initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalState);
} else {
    initGlobalState();
}

window.POSDebug = window.POSDebug || {};