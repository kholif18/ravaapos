// Toggle Password Visibility
const togglePassword = document.querySelector('.toggle-password');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}

// Alert Helper
const alertContainer = document.getElementById('alertContainer');

function showAlert(message, isError = true) {
    alertContainer.innerHTML = `
        <div class="alert-modern ${!isError ? 'success' : ''}">
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
    }, 4500);
}

// Demo Credentials Buttons
const demoButtons = document.querySelectorAll('.demo-btn');
demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-user');
        const password = btn.getAttribute('data-pass');
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        showAlert(`✓ Demo credentials loaded: ${username} / ${password}`, false);

        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    });
});

// Form Submission
const form = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');

function setLoading(loading) {
    if (loading) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span><span>Authenticating...</span>';
    } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
    }
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const csrfTokenElem = document.getElementById('csrfField');
        const csrfToken = csrfTokenElem ? csrfTokenElem.value : '';

        if (!username || !password) {
            showAlert('Please enter username and password!');
            return;
        }

        setLoading(true);

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('_csrf', csrfToken);

        try {
            const response = await fetch('/login', {
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

            if (responseText.includes('alert alert-danger') || responseText.toLowerCase().includes('invalid') || response.status !== 200) {
                let errMsg = 'Login failed. Invalid credentials.';
                const match = responseText.match(/<div class="alert alert-danger[^>]*>(.*?)<\/div>/s);
                if (match && match[1]) {
                    errMsg = match[1].replace(/<button.*button>/, '').trim();
                }
                showAlert(errMsg);
                setLoading(false);
            } else if (responseText.includes('dashboard') || response.url.includes('dashboard')) {
                window.location.href = '/';
            } else {
                showAlert('Unexpected response from server');
                setLoading(false);
            }
        } catch (err) {
            console.warn('Using demo mode - Backend not available', err);

            const validCreds = [
                { username: 'admin', password: 'pos123' },
                { username: 'kasir', password: 'pos789' },
                { username: 'manager', password: 'pos456' }
            ];

            const isValid = validCreds.some(cred => cred.username === username && cred.password === password);

            if (isValid) {
                showAlert('Login successful! Redirecting to dashboard...', false);
                setLoading(true);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                showAlert('Invalid credentials. Use admin/pos123, kasir/pos789, or manager/pos456');
                setLoading(false);
                
                const card = document.querySelector('.login-card');
                card.style.animation = 'shake 0.4s ease';
                setTimeout(() => {
                    card.style.animation = '';
                }, 400);
            }
        }
    });
}