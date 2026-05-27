// Particle Animation
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');

let particles = [];
let particleCount = 80;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function createParticle() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
    };
}

function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();

        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
    });

    requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
});

resizeCanvas();
initParticles();
drawParticles();

// Toggle Password Visibility
const toggleBtn = document.querySelector('.toggle-pwd');
const passwordInput = document.getElementById('password');

if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        toggleBtn.innerHTML = type === 'password' ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
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
const credButtons = document.querySelectorAll('.cred-btn');
credButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const username = btn.getAttribute('data-user');
        const password = btn.getAttribute('data-pass');
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        showAlert(`✨ Demo credentials loaded: ${username} / ${password}`, false);

        // Highlight effect
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
        loginBtn.style.opacity = '0.8';
        loginBtn.innerHTML = '<span class="spinner-btn"></span><span>Authenticating...</span>';
    } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
    }
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const csrfToken = document.getElementById('csrfField').value;

        if (!username || !password) {
            showAlert('❌ Please enter username and password!');
            // Shake animation on form
            document.querySelector('.login-card').style.animation = 'shake 0.4s ease';
            setTimeout(() => {
                document.querySelector('.login-card').style.animation = '';
            }, 400);
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

            if (responseText.includes('alert alert-danger') || response.status !== 200) {
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
            console.warn('Fetch error, using demo mode', err);

            // Demo mode - for testing without backend
            if ((username === 'admin' && password === 'pos123') ||
                (username === 'kasir' && password === 'pos789')) {
                showAlert('✅ Login successful! Redirecting to dashboard...', false);
                setLoading(true);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                showAlert('⚠️ Invalid credentials. Use admin/pos123 or kasir/pos789');
                setLoading(false);

                // Shake animation
                const card = document.querySelector('.login-card');
                card.style.animation = 'shake 0.4s ease';
                setTimeout(() => {
                    card.style.animation = '';
                }, 400);
            }
        }
    });
}

// Input focus effects
const inputs = document.querySelectorAll('.input-field input');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.parentElement.style.transform = 'translateX(5px)';
    });
    input.addEventListener('blur', () => {
        input.parentElement.parentElement.style.transform = '';
    });
});

// Add floating animation on hover
// const loginCard = document.querySelector('.login-card');
// loginCard.addEventListener('mouseenter', () => {
//     loginCard.style.transform = 'translateY(-5px)';
// });
// loginCard.addEventListener('mouseleave', () => {
//     loginCard.style.transform = '';
// });