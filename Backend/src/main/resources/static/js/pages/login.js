/**
 * Login page
 * ----------
 * Login → session saved → role worked out → sent to the right dashboard
 * (or back to the page they came from, if it's one of our own pages).
 */

document.addEventListener('DOMContentLoaded', () => {
  startImageCarousel(document.querySelector('.auth-stage'));

  const loginForm = document.getElementById('loginForm');
  const forgotForm = document.getElementById('forgotForm');

  // Keep ?redirect= when switching to the register page
  const redirect = getQueryParam('redirect');
  if (redirect) {
    document.getElementById('registerLink').href = `register.html?redirect=${encodeURIComponent(redirect)}`;
  }

  if (APP_CONFIG.DEMO_MODE) {
    document.getElementById('demoAccounts').hidden = false;
  }

  showStartMessage();

  loginForm.addEventListener('submit', handleLogin);
  forgotForm.addEventListener('submit', handleForgotPassword);

  document.querySelectorAll('[data-demo-role]').forEach(button => {
    button.addEventListener('click', () => handleDemoLogin(button));
  });

  document.getElementById('showForgotBtn').addEventListener('click', () => {
    document.getElementById('forgotEmail').value = document.getElementById('loginEmail').value;
    toggleView('forgot');
  });
  document.getElementById('backToLoginBtn').addEventListener('click', () => toggleView('login'));
});

function showStartMessage() {
  const session = getSession();
  if (session) {
    showAlert('loginAlert', 'info',
      `You're already logged in as ${session.fullName} (${ROLE_LABELS[session.role]}). Log in below to switch accounts, or go to your dashboard.`);
    return;
  }
  if (getQueryParam('reason') === 'auth') {
    showAlert('loginAlert', 'info', 'Please log in to continue.');
  }
}

function toggleView(view) {
  document.getElementById('loginView').hidden = view !== 'login';
  document.getElementById('forgotView').hidden = view !== 'forgot';
  document.getElementById(view === 'login' ? 'loginEmail' : 'forgotEmail').focus();
}

function showAlert(id, type, message) {
  const alert = document.getElementById(id);
  const icons = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' };
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `<i class="fa-solid ${icons[type]}" aria-hidden="true"></i><span></span>`;
  alert.querySelector('span').textContent = message;
  alert.hidden = false;
}

function goToNextPage(session) {
  const fallback = getDashboardUrl(session.role);
  const next = getSafeRedirect(getQueryParam('redirect'), fallback);
  setTimeout(() => { window.location.href = next; }, 600);
}

// ---------- Email + password ----------
async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById('loginSubmitBtn');
  document.getElementById('loginAlert').hidden = true;

  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;

  const errors = {};
  if (!email) errors.email = 'Enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'Enter a valid email address, e.g. name@example.com.';
  if (!password) errors.password = 'Enter your password.';
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);

  setButtonLoading(submitBtn, true, 'Logging in…');
  try {
    const session = await signIn(email, password, form.elements.remember.checked);
    showAlert('loginAlert', 'success', `Welcome back, ${session.fullName}! Taking you to your dashboard…`);
    goToNextPage(session);
  } catch (err) {
    showAlert('loginAlert', 'error', err.message || 'Login failed. Please try again.');
    setButtonLoading(submitBtn, false);
  }
}

// ---------- Demo accounts ----------
async function handleDemoLogin(button) {
  setButtonLoading(button, true, 'Opening…');
  try {
    const session = await signInAsDemo(button.dataset.demoRole);
    showAlert('loginAlert', 'success', `Logged in as the demo ${ROLE_LABELS[session.role].toLowerCase()} (${session.fullName}).`);
    goToNextPage(session);
  } catch (err) {
    showAlert('loginAlert', 'error', err.message);
    setButtonLoading(button, false);
  }
}

// ---------- Forgot password ----------
async function handleForgotPassword(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById('forgotSubmitBtn');
  const email = form.elements.email.value.trim();

  if (!isValidEmail(email)) {
    showFieldErrors(form, { email: 'Enter a valid email address.' });
    return;
  }
  clearFieldErrors(form);

  setButtonLoading(submitBtn, true, 'Sending…');
  try {
    await requestPasswordReset(email);
    // Same message whether or not the account exists, so emails can't be guessed
    const message = `If an account exists for ${email}, a password reset link is on its way.`
      + (APP_CONFIG.DEMO_MODE ? ' (Demo mode: no email was actually sent.)' : '');
    showAlert('forgotAlert', 'success', message);
    form.reset();
  } catch (err) {
    showAlert('forgotAlert', 'error', 'We couldn’t send the reset link. Please try again.');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}
