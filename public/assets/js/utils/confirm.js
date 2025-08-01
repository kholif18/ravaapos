// public/assets/js/utils/confirm.js
export function confirmDelete(message = 'Data ini akan dihapus. Lanjutkan?', onConfirm) {
    const swalPromise = Swal.fire({
        title: 'Apakah kamu yakin?',
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, hapus',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d'
    });

    // Jika user pakai callback
    if (typeof onConfirm === 'function') {
        swalPromise.then(result => {
            if (result.isConfirmed) onConfirm();
        });
    }

    // Jika user pakai await
    return swalPromise.then(result => result.isConfirmed);
}
