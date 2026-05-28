// =====================================================
// AUTHENTICATION SYSTEM - MERGED SCRIPT
// Supported pages: Login, Register, Forgot Password, Reset Password
// =====================================================

// =====================================================
// UTILITY FUNCTIONS (Digunakan bersama semua halaman)
// =====================================================

// Alert Helper untuk semua jenis halaman
const alertContainer = document.getElementById('alertContainer');

function showAlert(message, isError = true) {
    if (!alertContainer) return;

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
    }, 5000);
}

// =====================================================
// PASSWORD TOGGLE FUNCTION (Untuk semua halaman)
// =====================================================

function initPasswordToggle() {
    // Untuk toggle password di semua halaman
    document.querySelectorAll('.toggle-password, .toggle-password2').forEach(toggle => {
        toggle.addEventListener('click', function () {
            // Mencari input yang sesuai
            let input = null;

            // Jika toggle berada di dalam input-wrapper
            if (this.parentElement && this.parentElement.querySelector('input')) {
                input = this.parentElement.querySelector('input');
            }
            // Atau jika ada struktur yang berbeda (untuk register/reset)
            else if (this.previousElementSibling && this.previousElementSibling.tagName === 'INPUT') {
                input = this.previousElementSibling;
            }

            if (input) {
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });
}

// =====================================================
// PASSWORD VALIDATION FUNCTION (Register & Reset Password)
// =====================================================

function initPasswordValidation(passwordId, lengthReqId, upperReqId, numberReqId) {
    const password = document.getElementById(passwordId);
    if (!password) return null;

    const lengthReq = document.getElementById(lengthReqId);
    const upperReq = document.getElementById(upperReqId);
    const numberReq = document.getElementById(numberReqId);

    function validatePassword() {
        const val = password.value;

        const hasLength = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val);
        const hasNumber = /[0-9]/.test(val);

        if (lengthReq) {
            lengthReq.className = hasLength ? 'valid' : 'invalid';
            lengthReq.innerHTML = hasLength ? '<i class="fas fa-check-circle"></i> 8+ characters' : '<i class="fas fa-circle"></i> 8+ characters';
        }

        if (upperReq) {
            upperReq.className = hasUpper ? 'valid' : 'invalid';
            upperReq.innerHTML = hasUpper ? '<i class="fas fa-check-circle"></i> Uppercase' : '<i class="fas fa-circle"></i> Uppercase';
        }

        if (numberReq) {
            numberReq.className = hasNumber ? 'valid' : 'invalid';
            numberReq.innerHTML = hasNumber ? '<i class="fas fa-check-circle"></i> Number' : '<i class="fas fa-circle"></i> Number';
        }

        return hasLength && hasUpper && hasNumber;
    }

    password.addEventListener('input', validatePassword);

    // Return function so it can be called elsewhere
    return validatePassword;
}

// =====================================================
// SET LOADING STATE FUNCTION
// =====================================================

function setButtonLoading(button, loading, originalHtml, loadingText) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner"></span><span>${loadingText}</span>`;
    } else {
        button.disabled = false;
        button.innerHTML = originalHtml;
    }
}

// =====================================================
// LOGIN PAGE FUNCTIONALITY
// =====================================================

function initLoginPage() {
    // Password Toggle untuk login
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Demo Credentials Buttons
    const demoButtons = document.querySelectorAll('.demo-btn');
    demoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.getAttribute('data-user');
            const password = btn.getAttribute('data-pass');
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');

            if (usernameField) usernameField.value = username;
            if (passwordField) passwordField.value = password;

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

    if (form && loginBtn) {
        const originalHtml = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';

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

            setButtonLoading(loginBtn, true, originalHtml, 'Authenticating...');

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
                    setButtonLoading(loginBtn, false, originalHtml, '');
                } else if (responseText.includes('dashboard') || response.url.includes('dashboard')) {
                    window.location.href = '/';
                } else {
                    showAlert('Unexpected response from server');
                    setButtonLoading(loginBtn, false, originalHtml, '');
                }
            } catch (err) {
                console.warn('Using demo mode - Backend not available', err);

                const validCreds = [{
                        username: 'admin',
                        password: 'pos123'
                    },
                    {
                        username: 'kasir',
                        password: 'pos789'
                    },
                    {
                        username: 'manager',
                        password: 'pos456'
                    }
                ];

                const isValid = validCreds.some(cred => cred.username === username && cred.password === password);

                if (isValid) {
                    showAlert('Login successful! Redirecting to dashboard...', false);
                    setButtonLoading(loginBtn, true, originalHtml, 'Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 1500);
                } else {
                    showAlert('Invalid credentials. Use admin/pos123, kasir/pos789, or manager/pos456');
                    setButtonLoading(loginBtn, false, originalHtml, '');

                    const card = document.querySelector('.login-card');
                    if (card) {
                        card.style.animation = 'shake 0.4s ease';
                        setTimeout(() => {
                            card.style.animation = '';
                        }, 400);
                    }
                }
            }
        });
    }
}

// =====================================================
// REGISTER PAGE FUNCTIONALITY
// =====================================================

function initRegisterPage() {
    // Password validation
    const validatePassword = initPasswordValidation('password', 'lengthReq', 'upperReq', 'numberReq');

    // Form submission
    const form = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');

    if (form && registerBtn) {
        const originalHtml = '<span>Sign Up</span><i class="fas fa-user-plus"></i>';

        form.addEventListener('submit', function (e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsChecked = document.getElementById('termsCheckbox');
            const name = document.getElementById('name').value.trim();
            const username = document.getElementById('username').value.trim();
            const email = document.getElementById('email').value.trim();

            // Client-side validation
            if (!name || !username || !email || !password) {
                e.preventDefault();
                showAlert('Please fill in all fields!', true);
                return false;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                e.preventDefault();
                showAlert('Please enter a valid email address!', true);
                return false;
            }

            if (validatePassword && !validatePassword()) {
                e.preventDefault();
                showAlert('Please meet all password requirements!', true);
                return false;
            }

            if (password !== confirmPassword) {
                e.preventDefault();
                showAlert('Passwords do not match!', true);
                return false;
            }

            if (termsChecked && !termsChecked.checked) {
                e.preventDefault();
                showAlert('Please accept the Terms of Service!', true);
                return false;
            }

            // If all validations pass, form will submit normally
            setButtonLoading(registerBtn, true, originalHtml, 'Creating Account...');
        });
    }
}

// =====================================================
// FORGOT PASSWORD PAGE FUNCTIONALITY
// =====================================================

function initForgotPasswordPage() {
    const form = document.getElementById('forgotPasswordForm');
    const resetBtn = document.getElementById('resetBtn');

    if (form && resetBtn) {
        const originalHtml = '<span>Send Reset Link</span><i class="fas fa-paper-plane"></i>';

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const csrfTokenElem = document.getElementById('csrfField');
            const csrfToken = csrfTokenElem ? csrfTokenElem.value : '';

            if (!email) {
                showAlert('Please enter your email address!', true);
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert('Please enter a valid email address!', true);
                return;
            }

            setButtonLoading(resetBtn, true, originalHtml, 'Sending...');

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
                    setButtonLoading(resetBtn, false, originalHtml, '');
                }
            } catch (err) {
                console.warn('Demo mode', err);
                // Demo mode - simulate success
                showAlert('✓ Demo: Reset link sent to ' + email, false);
                setButtonLoading(resetBtn, true, originalHtml, '');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            }
        });
    }
}

// =====================================================
// RESET PASSWORD PAGE FUNCTIONALITY
// =====================================================

function initResetPasswordPage() {
    // Password validation
    const validatePassword = initPasswordValidation('password', 'lengthReq', 'upperReq', 'numberReq');

    // Password Toggle untuk kedua field
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    const togglePassword2 = document.querySelector('.toggle-password2');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (togglePassword2 && confirmPasswordInput) {
        togglePassword2.addEventListener('click', function () {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Form submission
    const form = document.getElementById('resetPasswordForm');
    const resetBtn = document.getElementById('resetBtn');

    if (form && resetBtn) {
        const originalHtml = '<span>Reset Password</span><i class="fas fa-key"></i>';

        form.addEventListener('submit', function (e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (validatePassword && !validatePassword()) {
                e.preventDefault();
                showAlert('Please meet all password requirements!', true);
                return false;
            }

            if (password !== confirmPassword) {
                e.preventDefault();
                showAlert('Passwords do not match!', true);
                return false;
            }

            setButtonLoading(resetBtn, true, originalHtml, 'Resetting Password...');
        });
    }
}

// =====================================================
// INITIALIZATION - Detect which page is loaded
// =====================================================

// Initialize common components
initPasswordToggle();

// Detect page based on body class or element existence
document.addEventListener('DOMContentLoaded', function () {
    // Login page detection
    if (document.getElementById('loginForm')) {
        initLoginPage();
    }

    // Register page detection
    if (document.getElementById('registerForm')) {
        initRegisterPage();
    }

    // Forgot password page detection
    if (document.getElementById('forgotPasswordForm')) {
        initForgotPasswordPage();
    }

    // Reset password page detection
    if (document.getElementById('resetPasswordForm')) {
        initResetPasswordPage();
    }
});