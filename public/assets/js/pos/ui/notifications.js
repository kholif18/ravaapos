// UI/Notifications
// Menggunakan Swal dari global window (sudah di-load di HTML)

export function showSuccess(message, title = 'Sukses') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    } else {
        alert(`✅ ${title}: ${message}`);
    }
}

export function showError(message, title = 'Error') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    } else {
        alert(`❌ ${title}: ${message}`);
    }
}

export function showWarning(message, title = 'Peringatan') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'warning',
            title: title,
            text: message,
            confirmButtonText: 'OK'
        });
    } else {
        alert(`⚠️ ${title}: ${message}`);
    }
}

export function showInfo(message, title = 'Informasi') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: title,
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
    } else {
        alert(`ℹ️ ${title}: ${message}`);
    }
}

export function confirmDialog(message, title = 'Konfirmasi') {
    if (typeof Swal !== 'undefined') {
        return Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya',
            cancelButtonText: 'Batal'
        });
    } else {
        return Promise.resolve({
            isConfirmed: confirm(`${title}: ${message}`)
        });
    }
}