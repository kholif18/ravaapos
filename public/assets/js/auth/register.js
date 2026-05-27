// Toggle Password Visibility
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function () {
        const input = this.previousElementSibling;

        input.type = input.type === 'password' ?
            'text' :
            'password';

        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

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
const form = document.getElementById('registerForm');
const registerBtn = document.getElementById('registerBtn');

if (form) {
    form.addEventListener('submit', function (e) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsChecked = document.getElementById('termsCheckbox').checked;
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

        if (!termsChecked) {
            e.preventDefault();
            showAlert('Please accept the Terms of Service!', true);
            return false;
        }

        // If all validations pass, form will submit normally to /register
        registerBtn.innerHTML = '<span class="spinner"></span><span>Creating Account...</span>';
        registerBtn.disabled = true;
    });
}