// UI/SlidePanel
import {
    DOM
} from '../core/dom.js';

export function initSlidePanel() {
    const openBtn = DOM.openSlidePanelBtn;
    const closeBtn = DOM.closeSlidePanel;
    const overlay = DOM.slideOverlay;
    const panel = DOM.slidePanel;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            panel.classList.add('open');
            if (overlay) overlay.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeSlidePanel);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSlidePanel);
    }

    // Add Esc key support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const panel = DOM.slidePanel;
            if (panel && panel.classList.contains('open')) {
                closeSlidePanel();
            }
        }
    });
}

function closeSlidePanel() {
    if (DOM.slidePanel) DOM.slidePanel.classList.remove('open');
    if (DOM.slideOverlay) DOM.slideOverlay.classList.remove('active');
}