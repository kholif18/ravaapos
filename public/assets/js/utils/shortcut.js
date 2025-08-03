document.addEventListener('keydown', function (e) {
    // Cegah jika user sedang mengetik di input
    const isInputFocused = document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable;
    if (isInputFocused) return;

    // Shortcut: Alt + N (new)
    if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const btn = document.getElementById('btnOpenModalCreate');
        if (btn) btn.click();
    }
});