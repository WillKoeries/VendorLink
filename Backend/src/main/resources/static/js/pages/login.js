/**
 * Page controller for login.html
 */

document.addEventListener('DOMContentLoaded', () => {
    // Start carousel if available
    if (typeof startImageCarousel === 'function') {
        const stage = document.querySelector('.auth-stage');
        if (stage) startImageCarousel(stage);
    }

    // Toggle between login and forgot password views
    const showForgotBtn = document.getElementById('showForgotBtn');
    const backToLoginBtn = document.getElementById('backToLoginBtn');
    const loginView = document.getElementById('loginView');
    const forgotView = document.getElementById('forgotView');
    if (showForgotBtn && loginView && forgotView) {
        showForgotBtn.addEventListener('click', () => {
            loginView.hidden = true;
            forgotView.hidden = false;
            const forgotEmail = document.getElementById('forgotEmail');
            const loginEmail = document.getElementById('loginEmail') || document.getElementById('email');
            if (forgotEmail && loginEmail) forgotEmail.value = loginEmail.value;
        });
    }
    if (backToLoginBtn && loginView && forgotView) {
        backToLoginBtn.addEventListener('click', () => {
            forgotView.hidden = true;
            loginView.hidden = false;
        });
    }

    // Keep ?redirect= when switching to register page
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    const registerLink = document.getElementById('registerLink');
    if (redirectParam && registerLink) {
        registerLink.href = `register.html?redirect=${encodeURIComponent(redirectParam)}`;
    }

    // If the user is already logged in, redirect them directly to their dashboard
    const existingSession = window.getSession ? window.getSession() : null;
    if (existingSession) {
        window.location.href = existingSession.isOrganizer 
            ? 'organizer-dashboard.html' 
            : 'browse-events.html';
        return;
    }

    const form = document.getElementById('loginForm') 
              || document.getElementById('login-form') 
              || document.querySelector('form');

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email') 
                        || document.getElementById('loginEmail')
                        || form.querySelector('input[type="email"]');
        const passwordInput = document.getElementById('password') 
                           || document.getElementById('loginPassword')
                           || form.querySelector('input[type="password"]');
        const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const errorBanner = document.getElementById('errorBanner') 
                         || document.getElementById('loginAlert')
                         || document.querySelector('.error-message');

        const email = emailInput?.value.trim() || '';
        const password = passwordInput?.value || '';

        if (errorBanner) {
            errorBanner.style.display = 'none';
            errorBanner.hidden = true;
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Signing in...';

        try {
            // Invoke the canonical global function
            const result = await window.signIn(email, password);

            // Handle redirect query parameter if one was provided
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
