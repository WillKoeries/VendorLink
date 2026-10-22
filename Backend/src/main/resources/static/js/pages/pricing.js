/**
 * Pricing page, plan tabs and PayFast subscription checkout.
 */

const ANNUAL_DISCOUNT = 0.2;

document.addEventListener('DOMContentLoaded', () => {
  setupPlanTabs();
  document.getElementById('annualToggle').addEventListener('change', (e) => updatePrices(e.target.checked));
  setupPayFastButtons();
  showPaymentResult();
});

function setupPlanTabs() {
  const tabs = [
    { tab: document.getElementById('vendorTab'), panel: document.getElementById('vendorPlans') },
    { tab: document.getElementById('organizerTab'), panel: document.getElementById('organizerPlans') }
  ];

  function select(index) {
    tabs.forEach((item, i) => {
      const active = i === index;
      item.tab.classList.toggle('is-active', active);
      item.tab.setAttribute('aria-selected', String(active));
      item.tab.tabIndex = active ? 0 : -1;
      item.panel.hidden = !active;
    });
  }

  tabs.forEach((item, index) => {
    item.tab.addEventListener('click', () => select(index));
    item.tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = index === 0 ? 1 : 0;
      select(next);
      tabs[next].tab.focus();
    });
  });

  if (window.location.hash === '#organizers') select(1);
}

function setupPayFastButtons() {
  document.querySelectorAll('[data-paid-plan]').forEach(button => {
    button.addEventListener('click', () => startSubscription(button));
  });
}

async function startSubscription(button) {
  const session = window.getSession ? window.getSession() : null;
  if (!session) {
    window.location.href = `login.html?redirect=${encodeURIComponent('pricing.html')}&reason=auth`;
    return;
  }

  const billingCycle = document.getElementById('annualToggle').checked ? 'ANNUAL' : 'MONTHLY';
  const planCard = button.closest('.plan-card');
  const planName = planCard?.querySelector('.plan-name')?.textContent?.trim() || button.dataset.paidPlan;
  const priceNumber = planCard?.querySelector('.price-number')?.textContent?.trim() || '';

  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = 'Opening PayFast...';

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
    const origin = window.location.origin;

    // Store pending payment in sessionStorage before leaving
    sessionStorage.setItem('vl_pending_payment', JSON.stringify({
      plan: button.dataset.paidPlan,
      billingCycle,
      planName,
      amount: priceNumber,
      timestamp: Date.now()
    }));

    const response = await fetch('/api/payfast/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        plan: button.dataset.paidPlan,
        billingCycle,
        returnUrl: `${origin}/payment-status.html?payment=complete`,
        cancelUrl: `${origin}/payment-status.html?payment=cancelled`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Could not start the subscription payment.');

    if (data.merchantPaymentId) {
      sessionStorage.setItem('vl_pending_payment_id', data.merchantPaymentId);
    }

    if (data.simulatorEnabled) {
      await completeSimulatedPayment(data.merchantPaymentId, token);
      window.location.href = `payment-status.html?payment=complete&payment_id=${encodeURIComponent(data.merchantPaymentId)}`;
      return;
    }
    submitToPayFast(data);
  } catch (error) {
    showToast(error.message || 'Could not start the subscription payment.', 'error');
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function completeSimulatedPayment(merchantPaymentId, token) {
  const response = await fetch(`/api/dev/payfast/complete/${encodeURIComponent(merchantPaymentId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'The local payment simulator could not complete the subscription.');
  }
}

function submitToPayFast(redirect) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = redirect.processUrl;
  form.hidden = true;
  Object.entries(redirect.fields).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function showPaymentResult() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('payment')) {
    // Forward to dedicated payment status page
    window.location.replace(`payment-status.html${window.location.search}`);
  }
}

function updatePrices(isAnnual) {
  document.querySelectorAll('.price-number[data-monthly]').forEach(priceEl => {
    const monthly = Number(priceEl.dataset.monthly);
    const perMonth = isAnnual ? Math.round(monthly * (1 - ANNUAL_DISCOUNT)) : monthly;
    priceEl.textContent = perMonth;
    const termEl = priceEl.nextElementSibling;
    termEl.textContent = isAnnual ? `/ month, billed ${formatCurrency(perMonth * 12)} yearly` : '/ month';
  });
}
