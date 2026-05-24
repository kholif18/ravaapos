// UI/Loading
import {
    DOM
} from '../core/dom.js';

// Gunakan nama yang berbeda
export function updateClock() {
    if (DOM.currentTime) {
        DOM.currentTime.textContent = new Date().toLocaleTimeString('id-ID');
    }
}

export function showLoading(container, message = 'Loading...') {
    if (container) {
        container.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2 text-muted">${message}</p>
            </div>
        `;
    }
}

export function hideLoading(container, originalContent) {
    if (container && originalContent) {
        container.innerHTML = originalContent;
    }
}