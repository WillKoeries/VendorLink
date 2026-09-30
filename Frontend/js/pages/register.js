/**
 * Register page
 * -------------
 * Vendors and organisers can sign up. ?role=ORGANIZER pre-selects the
 * organiser option (used by the Pricing page).
 */

document.addEventListener('DOMContentLoaded', () => {
  startImageCarousel(document.querySelector('.auth-stage'));

  const form = document.getElementById('registerForm');

  // Pre-select the role from the URL
  const roleFromUrl = getQueryParam('role');
  if (roleFromUrl === Role.ORGANIZER || roleFromUrl === Role.VENDOR) {
    form.querySelector(`input[name="role"][value="${roleFromUrl}"]`).checked = true;
  }
  updateBusinessLabel();

  // Keep ?redirect= when switching to the login page
  const redirect = getQueryParam('redirect');
  if (redirect) {
    document.getElementById('loginLink').href = `login.html?redirect=${encodeURIComponent(redirect)}`;
  }

  if (APP_CONFIG.DEMO_MODE) document.getElementById('demoRegisterNote').hidden = false;

  form.querySelectorAll('input[name="role"]').forEach(radio => radio.addEventListener('change', updateBusinessLabel));
  form.addEventListener('submit', handleRegister);
});

function selectedRole() {
  return document.querySelector('input[name="role"]:checked').value;
}

// "Business name" for vendors, "Organisation name" for organisers
function updateBusinessLabel() {
  const isOrganizer = selectedRole() === Role.ORGANIZER;
  document.getElementById('regBusinessLabel').innerHTML =
    `${isOrganizer ? 'Organisation name' : 'Business name'} <span class="required">*</span>`;
  document.getElementById('regBusinessName').placeholder = isOrganizer
    ? 'e.g. Cape Markets & Festivals Co.'
    : "e.g. Mama's Authentic Bakes";
}

function validateRegistration(data) {
  const errors = {};
  if (data.fullName.trim().length < 2) errors.fullName = 'Enter your full name.';
  if (!isValidEmail(data.email)) errors.email = 'Enter a valid email address, e.g. name@example.com.';
  if (data.phone.trim() && !isValidPhone(data.phone)) errors.phone = 'Enter a valid phone number, e.g. +27 82 123 4567.';
  if (data.businessName.trim().length < 2) {
    errors.businessName = data.role === Role.ORGANIZER ? 'Enter your organisation name.' : 'Enter your business name.';
  }
  if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) {
    errors.password = 'Use at least 8 characters, including a letter and a number.';
  }
  if (!data.confirmPassword) errors.confirmPassword = 'Type your password again.';
  else if (data.password !== data.confirmPassword) errors.confirmPassword = 'Passwords don’t match.';
  if (!data.terms) errors.terms = 'Please accept the terms to continue.';
  return errors;
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const alert = document.getElementById('registerAlert');
  const submitBtn = document.getElementById('registerSubmitBtn');
  alert.hidden = true;

  const data = {
    role: selectedRole(),
    fullName: form.elements.fullName.value,
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value,
    businessName: form.elements.businessName.value,
    password: form.elements.password.value,
    confirmPassword: form.elements.confirmPassword.value,
    terms: form.elements.terms.checked
  };

  const errors = validateRegistration(data);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);

  setButtonLoading(submitBtn, true, 'Creating account…');
  try {
    const session = await registerAccount(data);
    form.elements.password.value = '';
    form.elements.confirmPassword.value = '';
    alert.className = 'alert alert-success';
    alert.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span></span>';
    alert.querySelector('span').textContent = `Welcome to VendorLink, ${session.fullName}! Setting up your dashboard…`;
    alert.hidden = false;

    const next = getSafeRedirect(getQueryParam('redirect'), `${getDashboardUrl(session.role)}?welcome=1`);
    setTimeout(() => { window.location.href = next; }, 900);
  } catch (err) {
    alert.className = 'alert alert-error';
    alert.innerHTML = '<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span></span>';
    alert.querySelector('span').textContent = err.message || 'We couldn’t create your account. Please try again.';
    alert.hidden = false;
    setButtonLoading(submitBtn, false);
  }
}
