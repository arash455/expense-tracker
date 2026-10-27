// Login + Register page

// Already logged in? Go straight to the dashboard.
if (getToken()) location.href = 'dashboard.html';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const message = document.getElementById('message');

// Switch between the "Log in" and "Create account" tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    loginForm.hidden = tab.dataset.tab !== 'login';
    registerForm.hidden = tab.dataset.tab !== 'register';
    message.textContent = '';
  });
});

async function submitAuth(form, path) {
  const button = form.querySelector('button[type="submit"]');
  const body = Object.fromEntries(new FormData(form));

  message.textContent = '';
  button.disabled = true;
  try {
    const { token, user } = await api(path, { method: 'POST', body });
    saveSession(token, user);
    location.href = user.role === 'admin' ? 'admin.html' : 'dashboard.html';
  } catch (err) {
    message.textContent = err.message;
  } finally {
    button.disabled = false;
  }
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitAuth(loginForm, '/api/auth/login');
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitAuth(registerForm, '/api/auth/register');
});
