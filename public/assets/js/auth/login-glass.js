// Futuristic interactive JS: dynamic mouse spotlight, password toggle, form handling with animation + mock validation
const spotlight = document.getElementById('spotlight');
document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth * 100;
    const y = e.clientY / window.innerHeight * 100;
    spotlight.style.setProperty('--x', `${x}%`);
    spotlight.style.setProperty('--y', `${y}%`);
});

// Password visibility toggle with futuristic icon change
const toggleBtn = document.getElementById('togglePassIcon');
const passwordInput = document.getElementById('loginPassword');
if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleBtn.innerHTML = type === 'password' ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
    });
}

// alert helper
const alertContainer = document.getElementById('alertContainer');

function showAlert(message, isError = true) {
    if (!alertContainer) return;
    alertContainer.innerHTML = `
        <div class="alert-future">
            <i class="fas ${isError ? 'fa-skull-crosswalk' : 'fa-circle-check'}"></i>
            <span>${message}</span>
        </div>
    `;
    // auto remove after 5 seconds
    setTimeout(() => {
        if (alertContainer.firstChild) {
            alertContainer.firstChild.style.opacity = '0';
            setTimeout(() => {
                if (alertContainer.firstChild && alertContainer.firstChild.remove) alertContainer.firstChild.remove();
            }, 300);
        }
    }, 4500);
}

// simulated login request (as per original backend route /login with POST)
const form = document.getElementById('futuristicLoginForm');
const loginBtn = document.getElementById('loginBtn');

// show demo hint credentials placeholder
const demoHint = document.getElementById('demoHint');
if (demoHint) {
    demoHint.addEventListener('click', (e) => {
        e.preventDefault();
        const usernameField = document.getElementById('loginUsername');
        const passwordField = document.getElementById('loginPassword');
        if (usernameField && passwordField) {
            usernameField.value = 'admin';
            passwordField.value = 'pos123';
            showAlert('✨ Demo credentials loaded: admin / pos123', false);
        }
    });
}

// loading state management
function setLoading(loading) {
    const btn = loginBtn;
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.style.opacity = '0.8';
        btn.innerHTML = '<span class="spinner"></span> <span>AUTHENTICATING...</span>';
    } else {
        btn.disabled = false;
        btn.innerHTML = '<span>LOGIN SECURE</span> <i class="fas fa-arrow-right-to-bracket"></i>';
    }
}

// handle the form submission
if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const csrfTokenElem = document.getElementById('csrfField');
        const csrfToken = csrfTokenElem ? csrfTokenElem.value : '';

        if (!username || !password) {
            showAlert('❌ Username and Secure Key required!', true);
            return;
        }

        setLoading(true);

        // Prepare form data as x-www-form-urlencoded like original
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('_csrf', csrfToken);

        try {
            // Attempt to call actual backend login endpoint
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
                credentials: 'same-origin',
            });

            // If the server responds with redirect
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }

            const responseText = await response.text();

            // Check for error patterns
            if (responseText.includes('alert alert-danger') || responseText.toLowerCase().includes('invalid') || response.status !== 200) {
                let errMsg = 'Login failed. Invalid credentials.';
                const match = responseText.match(/<div class="alert alert-danger[^>]*>(.*?)<\/div>/s);
                if (match && match[1]) {
                    errMsg = match[1].replace(/<button.*button>/, '').trim();
                } else if (responseText.includes('Wrong username')) {
                    errMsg = 'Authentication error: Wrong username or password.';
                }
                showAlert(errMsg, true);
                setLoading(false);
                // shake animation on glass panel
                const panel = document.querySelector('.glass-panel');
                if (panel) {
                    panel.style.transform = 'translateX(4px)';
                    setTimeout(() => {
                        panel.style.transform = '';
                    }, 200);
                }
            } else if (responseText.includes('dashboard') || responseText.includes('redirect') || response.url.includes('dashboard')) {
                window.location.href = '/';
            } else {
                try {
                    const json = await response.json();
                    if (json.redirect) window.location.href = json.redirect;
                    else if (json.error) showAlert(json.error, true);
                    else showAlert('Unexpected response. Try again.', true);
                } catch (e) {
                    showAlert('Unable to connect to server. Check backend.', true);
                }
                setLoading(false);
            }
        } catch (err) {
            console.warn("Fetch error, running simulation for demo", err);
            // Demo simulation for showcase
            if ((username === 'admin' && password === 'pos123') ||
                (username === 'manager' && password === 'pos456') ||
                (username === 'kasir' && password === 'pos789')) {
                showAlert('✅ ACCESS GRANTED. Redirecting to Quantum Dashboard...', false);
                setLoading(true);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1200);
            } else {
                showAlert('⚠️ Futuristic Access Denied: Invalid credentials. Hint: admin/pos123', true);
                setLoading(false);
                // shake effect
                const panel = document.querySelector('.glass-panel');
                if (panel) {
                    panel.style.animation = 'shakeAlert 0.3s ease';
                    setTimeout(() => {
                        panel.style.animation = '';
                    }, 500);
                }
            }
        } finally {
            // safety timeout
            setTimeout(() => {
                if (loginBtn && loginBtn.disabled === true && !window.location.pathname.includes('dashboard')) {
                    setLoading(false);
                }
            }, 5000);
        }
    });
}

// add animated gradient border on focus
const inputs = document.querySelectorAll('.input-wrapper input');
inputs.forEach(input => {
    input.addEventListener('focus', (e) => {
        e.target.closest('.input-wrapper').style.boxShadow = '0 0 10px #0ff';
    });
    input.addEventListener('blur', (e) => {
        e.target.closest('.input-wrapper').style.boxShadow = '';
    });
});

// 3d tilt on card
const card = document.querySelector('.glass-panel');
if (card) {
    document.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateX = y * 3;
        const rotateY = x * 5;
        card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    });
    document.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });
}