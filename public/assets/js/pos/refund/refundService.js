export async function processRefund(invoiceNumber) {
    const res = await fetch('/pos/refund', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content
        },
        body: JSON.stringify({ invoiceNumber })
    });

    return await res.json();
}