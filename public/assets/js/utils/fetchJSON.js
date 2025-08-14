// public/assets/js/utils/fetchJSON.js
export async function fetchJSON(url, options = {}) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? {
                'CSRF-Token': csrfToken
            } : {}),
            ...options.headers
        },
        credentials: 'same-origin', // biar cookie session ikut terkirim
        ...options
    });

    if (!res.ok) {
        let message = `HTTP error! Status: ${res.status}`;
        try {
            const errData = await res.json();
            if (errData.message) {
                message = errData.message;
            }
        } catch (_) {}
        throw new Error(message);
    }

    return res.json();
}
