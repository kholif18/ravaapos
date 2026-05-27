// Toggle Password Visibility
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

// Password strength validation
const password = document.getElementById('password');
const lengthReq = document.getElementById('lengthReq');
const upperReq = document.getElementById('upperReq');
const numberReq = document.getElementById('numberReq');

function validatePassword() {
    const val = password.value;

    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);

    lengthReq.className = hasLength ? 'valid' : 'invalid';
    upperReq.className = hasUpper ? 'valid' : 'invalid';
    numberReq.className = hasNumber ? 'valid' : 'invalid';

    lengthReq.innerHTML = hasLength ? '<i class="fas fa-check-circle"></i> 8+ characters' : '<i class="fas fa-circle"></i> 8+ characters';
    upperReq.innerHTML = hasUpper ? '<i class="fas fa-check-circle"></i> Uppercase' : '<i class="fas fa-circle"></i> Uppercase';
    numberReq.innerHTML = hasNumber ? '<i class="fas fa-check-circle"></i> Number' : '<i class="fas fa-circle"></i> Number';

    return hasLength && hasUpper && hasNumber;
}

password.addEventListener('input', validatePassword);

// Alert Helper for client-side validation
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
    }, 5000);
}

// Form submission with client-side validation
const form = document.getElementById('resetPasswordForm');
const resetBtn = document.getElementById('resetBtn');

if (form) {
    form.addEventListener('submit', function (e) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!validatePassword()) {
            e.preventDefault();
            showAlert('Please meet all password requirements!', true);
            return false;
        }

        if (password !== confirmPassword) {
            e.preventDefault();
            showAlert('Passwords do not match!', true);
            return false;
        }

        // If validations pass, form will submit normally
        resetBtn.innerHTML = '<span class="spinner"></span><span>Resetting Password...</span>';
        resetBtn.disabled = true;
    });
}