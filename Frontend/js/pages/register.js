/**
 * Page controller for register.html
 */

document.addEventListener('DOMContentLoaded', () => {
    // Start carousel if available
    if (typeof startImageCarousel === 'function') {
        const stage = document.querySelector('.auth-stage');
        if (stage) startImageCarousel(stage);
    }

    const form = document.getElementById('registerForm') 
              || document.getElementById('register-form') 
              || document.querySelector('form');

    if (!form) return;

    // Handle role pre-selection from URL (?role=ORGANIZER)
    const params = new URLSearchParams(window.location.search);
    const roleFromUrl = params.get('role');
    if (roleFromUrl) {
        const radio = form.querySelector(`input[name="role"][value="${roleFromUrl}"]`);
        if (radio) radio.checked = true;
    }

    // Dynamic business/organisation label update
    const updateBusinessLabel = () => {
        const selectedRadio = form.querySelector('input[name="role"]:checked');
        const isOrganizer = selectedRadio ? selectedRadio.value === 'ORGANIZER' : false;
        const label = document.getElementById('regBusinessLabel');
        const input = document.getElementById('regBusinessName') || document.getElementById('businessName');
        if (label) {
            label.innerHTML = `${isOrganizer ? 'Organisation name' : 'Business name'} <span class="required">*</span>`;
        }
        if (input) {
            input.placeholder = isOrganizer ? 'e.g. Cape Markets & Festivals Co.' : "e.g. Mama's Authentic Bakes";
        }
    };
    form.querySelectorAll('input[name="role"]').forEach(r => r.addEventListener('change', updateBusinessLabel));
    updateBusinessLabel();

    // Keep ?redirect= when switching to login page
    const redirectParam = params.get('redirect');
    const loginLink = document.getElementById('loginLink');
    if (redirectParam && loginLink) {
        loginLink.href = `login.html?redirect=${encodeURIComponent(redirectParam)}`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = (document.getElementById('fullName') 
                       || document.getElementById('regFullName') 
                       || form.querySelector('input[name="fullName"]'))?.value.trim();
        const email = (document.getElementById('email') 
                    || document.getElementById('regEmail') 
                    || form.querySelector('input[type="email"]'))?.value.trim();
        const password = (document.getElementById('password') 
                       || document.getElementById('regPassword') 
                       || form.querySelector('input[name="password"]'))?.value;
        const confirmPassword = (document.getElementById('confirmPassword') 
                              || document.getElementById('regConfirm') 
                              || form.querySelector('input[name="confirmPassword"]'))?.value;
        const role = (document.getElementById('role') 
                   || form.querySelector('select[name="role"]') 
                   || form.querySelector('input[name="role"]:checked'))?.value || 'VENDOR';
        const businessName = (document.getElementById('businessName') 
                           || document.getElementById('regBusinessName') 
                           || form.querySelector('input[name="businessName"]'))?.value.trim();
        const phone = (document.getElementById('phone') 
                    || document.getElementById('regPhone') 
                    || form.querySelector('input[name="phone"]'))?.value.trim();

        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const errorBanner = document.getElementById('errorBanner') 
                         || document.getElementById('registerAlert') 
                         || document.querySelector('.error-message');

        if (errorBanner) {
            errorBanner.style.display = 'none';
            errorBanner.hidden = true;
        }

        if (password !== confirmPassword) {
            if (errorBanner) {
                errorBanner.textContent = 'Passwords do not match.';
                errorBanner.style.display = 'block';
                errorBanner.hidden = false;
                errorBanner.className = 'alert alert-error';
            } else {
                alert('Passwords do not match.');
            }
            return;
        }

        if (!password || password.length < 6) {
            if (errorBanner) {
                errorBanner.textContent = 'Password must be at least 6 characters long.';
                errorBanner.style.display = 'block';
                errorBanner.hidden = false;
                errorBanner.className = 'alert alert-error';
            } else {
                alert('Password must be at least 6 characters long.');
            }
            return;
        }

        const termsCheckbox = document.getElementById('regTerms') || form.querySelector('input[name="terms"]');
        if (termsCheckbox && !termsCheckbox.checked) {
            if (errorBanner) {
                errorBanner.textContent = 'Please accept the Terms & Conditions and Privacy Policy.';
                errorBanner.style.display = 'block';
                errorBanner.hidden = false;
                errorBanner.className = 'alert alert-error';
            } else {
                alert('Please accept the Terms & Conditions and Privacy Policy.');
            }
            return;
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';

        try {
            // Invoke the canonical global function
            const result = await window.registerAccount({
                fullName,
                email,
                password,
                role,
                businessName,
                phone
            });

            const redirectUrl = params.get('redirect');
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else if (result.user && result.user.role === 'ORGANIZER') {
                window.location.href = 'organizer-dashboard.html';
            } else {
                window.location.href = 'browse-events.html';
            }
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;

            if (errorBanner) {
                errorBanner.textContent = err.message;
                errorBanner.style.display = 'block';
                errorBanner.hidden = false;
                errorBanner.className = 'alert alert-error';
            } else {
                alert(err.message);
            }
        }
    });
});
