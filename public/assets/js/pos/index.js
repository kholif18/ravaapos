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

window.POSDebug = {
    version: '2.0.0',
    modules: [
        'core', 'cart', 'search', 'customer',
        'payment', 'transaction', 'ui', 'utils', 'reports'
    ]
};