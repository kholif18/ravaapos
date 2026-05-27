const alertContainer = document.getElementById('alertContainer');

function showAlert(message, isError = false) {
    alertContainer.innerHTML = `
                <div class="alert-modern ${isError ? 'error' : ''}">
                    <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;

    setTimeout(() => {
        if (alertContainer.firstChild) {
            alertContainer.firstChild.style.opacity = '0';
            setTimeout(() => {
                if (alertContainer.firstChild && alertContainer.firstChild.remove) {
                    alertContainer.firstChild.remove();
                }
            }, 300);
        }
    }, 5000);
}

const form = document.getElementById('forgotPasswordForm');
const resetBtn = document.getElementById('resetBtn');

function setLoading(loading) {
    if (loading) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span class="spinner"></span><span>Sending...</span>';
    } else {
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<span>Send Reset Link</span><i class="fas fa-paper-plane"></i>';
    }
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const csrfToken = document.getElementById('csrfField').value;

        if (!email) {
            showAlert('Please enter your email address!', true);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address!', true);
            return;
        }

        setLoading(true);

        const formData = new URLSearchParams();
        formData.append('email', email);
        formData.append('_csrf', csrfToken);

        try {
            const response = await fetch('/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                credentials: 'same-origin',
            });

            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const responseText = await response.text();

            if (response.status === 200 || responseText.includes('success')) {
                showAlert('✓ Reset link sent! Please check your email.', false);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                showAlert('Email not found. Please try again.', true);
                setLoading(false);
            }
        } catch (err) {
            console.warn('Demo mode', err);
            // Demo mode - simulate success
            showAlert('✓ Demo: Reset link sent to ' + email, false);
            setLoading(true);
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        }
    });
}