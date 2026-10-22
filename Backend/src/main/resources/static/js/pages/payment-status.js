/**
 * Payment Status Page Logic (payment-status.html)
 * Handles PayFast returns (success, cancellation, retry, and transaction abort).
 */

const PLAN_NAMES = {
  PROFESSIONAL_VENDOR: 'Professional Vendor',
  COMMERCIAL_BRAND: 'Commercial Brand',
  MARKET_OPERATOR: 'Market Operator'
};

document.addEventListener('DOMContentLoaded', async () => {
  await initPaymentStatus();
});

async function initPaymentStatus() {
  const params = new URLSearchParams(window.location.search);
  const paymentParam = (params.get('payment') || '').toLowerCase();
  const paymentId = params.get('payment_id') || params.get('m_payment_id') || params.get('merchantPaymentId')
      || sessionStorage.getItem('vl_pending_payment_id');

  let pendingInfo = null;
  try {
    const raw = sessionStorage.getItem('vl_pending_payment');
    if (raw) pendingInfo = JSON.parse(raw);
  } catch (e) {
    console.warn('Could not parse pending payment info:', e);
  }

  // Route according to payment state
  if (paymentParam === 'complete') {
    await handleCompletedPayment(paymentId, pendingInfo);
  } else if (paymentParam === 'cancelled' || paymentParam === 'failed') {
    handleUnsuccessfulPayment(paymentParam, paymentId, pendingInfo);
  } else {
    // If accessed directly without params, check active subscription or pending
    await handleDirectAccess(paymentId, pendingInfo);
  }
}

/**
 * Handle successful payment return from PayFast
 */
async function handleCompletedPayment(paymentId, pendingInfo) {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');

  if (!token) {
    // Not logged in or session lost
    renderSuccessView({
      plan: pendingInfo?.plan || 'Paid Plan',
      planName: pendingInfo?.planName || 'VendorLink Subscription',
      billingCycle: pendingInfo?.billingCycle || 'MONTHLY',
      amount: pendingInfo?.amount || '0',
      merchantPaymentId: paymentId || 'N/A',
      completedAt: new Date().toISOString(),
      isGuest: true
    });
    sessionStorage.removeItem('vl_pending_payment');
    sessionStorage.removeItem('vl_pending_payment_id');
    return;
  }

  // Poll or check status from backend
  try {
    let sub = null;

    if (paymentId) {
      sub = await fetchSubscriptionStatus(paymentId, token);

      // If pending in sandbox/dev mode, attempt sandbox auto-confirmation
      if (sub && sub.status === 'PENDING') {
        sub = await tryConfirmSandbox(paymentId, token) || sub;
      }

      // If still pending, poll a couple of times for ITN webhook
      if (sub && sub.status === 'PENDING') {
        for (let i = 0; i < 2; i++) {
          await new Promise(r => setTimeout(r, 2000));
          sub = await fetchSubscriptionStatus(paymentId, token);
          if (sub && sub.status === 'COMPLETED') break;
        }
      }
    } else {
      // Fallback: check active subscription
      sub = await fetchActiveSubscription(token);
    }

    if (sub && sub.status === 'COMPLETED') {
      renderSuccessView({
        plan: sub.plan,
        planName: PLAN_NAMES[sub.plan] || sub.plan,
        billingCycle: sub.billingCycle,
        amount: sub.amount,
        merchantPaymentId: sub.merchantPaymentId || paymentId,
        completedAt: sub.completedAt || new Date().toISOString()
      });
      sessionStorage.removeItem('vl_pending_payment');
      sessionStorage.removeItem('vl_pending_payment_id');
    } else {
      // Still pending activation (e.g. ITN in flight)
      renderProcessingView({
        plan: sub?.plan || pendingInfo?.plan,
        planName: sub?.plan ? (PLAN_NAMES[sub.plan] || sub.plan) : (pendingInfo?.planName || 'VendorLink Subscription'),
        billingCycle: sub?.billingCycle || pendingInfo?.billingCycle || 'MONTHLY',
        amount: sub?.amount || pendingInfo?.amount || '0',
        merchantPaymentId: sub?.merchantPaymentId || paymentId || 'N/A'
      });
    }
  } catch (err) {
    console.error('Error verifying payment:', err);
    // Even if status API fails, PayFast redirected to payment=complete
    renderSuccessView({
      plan: pendingInfo?.plan || 'PAID_PLAN',
      planName: pendingInfo?.planName || 'Subscription Plan',
      billingCycle: pendingInfo?.billingCycle || 'MONTHLY',
      amount: pendingInfo?.amount || '0',
      merchantPaymentId: paymentId || 'Confirmed via PayFast',
      completedAt: new Date().toISOString()
    });
    sessionStorage.removeItem('vl_pending_payment');
    sessionStorage.removeItem('vl_pending_payment_id');
  }
}

/**
 * Handle unsuccessful or cancelled payment from PayFast
 */
function handleUnsuccessfulPayment(reason, paymentId, pendingInfo) {
  const isCancelled = reason === 'cancelled';
  const planName = pendingInfo?.planName || (pendingInfo?.plan ? (PLAN_NAMES[pendingInfo.plan] || pendingInfo.plan) : 'VendorLink Subscription');
  const amount = pendingInfo?.amount ? formatPrice(pendingInfo.amount) : null;
  const cycle = pendingInfo?.billingCycle ? (pendingInfo.billingCycle === 'ANNUAL' ? 'Yearly' : 'Monthly') : null;

  const card = document.getElementById('paymentStatusCard');
  const icon = document.getElementById('statusIcon');
  const title = document.getElementById('statusTitle');
  const subtitle = document.getElementById('statusSubtitle');
  const body = document.getElementById('statusBody');
  const actions = document.getElementById('statusActions');

  icon.className = `status-icon-wrapper ${isCancelled ? 'status-icon-cancelled' : 'status-icon-failed'}`;
  icon.innerHTML = `<i class="fa-solid ${isCancelled ? 'fa-ban' : 'fa-circle-xmark'}"></i>`;

  title.textContent = isCancelled ? 'Payment Cancelled' : 'Payment Unsuccessful';
  subtitle.textContent = isCancelled
      ? 'You returned to VendorLink before completing the transaction on PayFast. Your account was not charged.'
      : 'We were unable to process your payment on PayFast. No funds have been deducted from your account.';

  let detailsHtml = '';
  if (pendingInfo) {
    detailsHtml = `
      <div class="receipt-box">
        <div class="receipt-box-header">
          <span>Attempted Plan</span>
          <span class="badge ${isCancelled ? 'badge-warning' : 'badge-danger'}">${isCancelled ? 'Cancelled' : 'Incomplete'}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label"><i class="fa-solid fa-layer-group"></i> Plan</span>
          <span class="receipt-value">${escapeHtml(planName)}</span>
        </div>
        ${cycle ? `
        <div class="receipt-row">
          <span class="receipt-label"><i class="fa-solid fa-clock"></i> Billing Cycle</span>
          <span class="receipt-value">${escapeHtml(cycle)}</span>
        </div>` : ''}
        ${amount ? `
        <div class="receipt-row">
          <span class="receipt-label"><i class="fa-solid fa-tag"></i> Price</span>
          <span class="receipt-value">${escapeHtml(amount)}</span>
        </div>` : ''}
        ${paymentId ? `
        <div class="receipt-row">
          <span class="receipt-label"><i class="fa-solid fa-receipt"></i> Reference</span>
          <span class="receipt-value"><span class="receipt-ref-code">${escapeHtml(paymentId.slice(0, 16))}...</span></span>
        </div>` : ''}
      </div>
    `;
  }

  body.innerHTML = `
    ${detailsHtml}
    <div class="action-prompt-box">
      <p><i class="fa-regular fa-circle-question" style="margin-right:6px;color:var(--primary);"></i> Would you like to try paying again, or cancel this transaction?</p>
    </div>
  `;

  actions.className = 'payment-actions split';
  actions.innerHTML = `
    <button type="button" class="btn btn-primary" id="retryPaymentBtn">
      <i class="fa-solid fa-rotate-right"></i> Try Again
    </button>
    <button type="button" class="btn btn-secondary" id="cancelTransactionBtn">
      <i class="fa-solid fa-xmark"></i> Cancel Transaction
    </button>
  `;

  // Attach event handlers
  document.getElementById('retryPaymentBtn').addEventListener('click', () => {
    retryPayment(pendingInfo);
  });

  document.getElementById('cancelTransactionBtn').addEventListener('click', () => {
    cancelTransaction(paymentId);
  });
}

/**
 * Handle direct access without query parameters
 */
async function handleDirectAccess(paymentId, pendingInfo) {
  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  if (token) {
    try {
      const active = await fetchActiveSubscription(token);
      if (active && active.status === 'COMPLETED') {
        renderSuccessView({
          plan: active.plan,
          planName: PLAN_NAMES[active.plan] || active.plan,
          billingCycle: active.billingCycle,
          amount: active.amount,
          merchantPaymentId: active.merchantPaymentId,
          completedAt: active.completedAt
        });
        return;
      }
    } catch (e) {
      console.warn('Could not fetch active subscription:', e);
    }
  }

  // If we have pending info, show as incomplete/cancelled prompt
  if (pendingInfo) {
    handleUnsuccessfulPayment('cancelled', paymentId, pendingInfo);
  } else {
    window.location.replace('pricing.html');
  }
}

/**
 * Render Success View
 */
function renderSuccessView(data) {
  const session = window.getSession ? window.getSession() : null;
  const dashboardUrl = (session && (session.isOrganizer || session.role === 'ORGANIZER' || session.role === 'ADMIN'))
      ? 'organizer-dashboard.html'
      : 'vendor-dashboard.html';

  const icon = document.getElementById('statusIcon');
  const title = document.getElementById('statusTitle');
  const subtitle = document.getElementById('statusSubtitle');
  const body = document.getElementById('statusBody');
  const actions = document.getElementById('statusActions');

  icon.className = 'status-icon-wrapper status-icon-success';
  icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';

  title.textContent = 'Payment Successful!';
  subtitle.textContent = 'Thank you! Your payment was received and your subscription plan is now active.';

  const formattedDate = formatDate(data.completedAt);
  const formattedAmount = formatPrice(data.amount);
  const cycleLabel = data.billingCycle === 'ANNUAL' ? 'Yearly' : 'Monthly';

  body.innerHTML = `
    <div class="receipt-box">
      <div class="receipt-box-header">
        <span>Payment Receipt</span>
        <span class="badge badge-success"><i class="fa-solid fa-check"></i> Active</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label"><i class="fa-solid fa-layer-group"></i> Plan</span>
        <span class="receipt-value">${escapeHtml(data.planName || data.plan)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label"><i class="fa-solid fa-calendar-check"></i> Billing Cycle</span>
        <span class="receipt-value">${escapeHtml(cycleLabel)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label"><i class="fa-solid fa-clock"></i> Date</span>
        <span class="receipt-value">${escapeHtml(formattedDate)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label"><i class="fa-solid fa-barcode"></i> Reference</span>
        <span class="receipt-value"><span class="receipt-ref-code">${escapeHtml(String(data.merchantPaymentId).slice(0, 18))}</span></span>
      </div>
      <div class="receipt-row total">
        <span class="receipt-label"><strong>Total Paid</strong></span>
        <span class="receipt-value">${escapeHtml(formattedAmount)}</span>
      </div>
    </div>

    <div class="status-info-banner">
      <i class="fa-solid fa-sparkles"></i>
      <div>
        <strong>Plan benefits unlocked!</strong> You can now enjoy full access to premium features, expanded application allowances, and enhanced visibility.
      </div>
    </div>
  `;

  actions.className = 'payment-actions split';
  actions.innerHTML = `
    <a href="${dashboardUrl}" class="btn btn-primary">
      <i class="fa-solid fa-gauge-high"></i> Go to Dashboard
    </a>
    <a href="browse-events.html" class="btn btn-secondary">
      <i class="fa-solid fa-calendar-days"></i> Browse Events
    </a>
  `;
}

/**
 * Render Processing / Pending View
 */
function renderProcessingView(data) {
  const icon = document.getElementById('statusIcon');
  const title = document.getElementById('statusTitle');
  const subtitle = document.getElementById('statusSubtitle');
  const body = document.getElementById('statusBody');
  const actions = document.getElementById('statusActions');

  icon.className = 'status-icon-wrapper status-icon-loading';
  icon.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i>';

  title.textContent = 'Payment Received!';
  subtitle.textContent = 'Your payment was successfully received on PayFast. Plan activation is currently being finalized.';

  body.innerHTML = `
    <div class="status-warning-banner">
      <i class="fa-solid fa-circle-info"></i>
      <div>
        Your plan confirmation is processing. You can proceed to your dashboard now, and your features will be ready momentarily.
      </div>
    </div>
  `;

  const session = window.getSession ? window.getSession() : null;
  const dashboardUrl = (session && (session.isOrganizer || session.role === 'ORGANIZER' || session.role === 'ADMIN'))
      ? 'organizer-dashboard.html'
      : 'vendor-dashboard.html';

  actions.className = 'payment-actions split';
  actions.innerHTML = `
    <button type="button" class="btn btn-primary" onclick="window.location.reload()">
      <i class="fa-solid fa-arrows-rotate"></i> Check Status Again
    </button>
    <a href="${dashboardUrl}" class="btn btn-secondary">
      <i class="fa-solid fa-gauge-high"></i> Continue to Dashboard
    </a>
  `;
}

/**
 * Action: Retry payment
 */
async function retryPayment(pendingInfo) {
  const retryBtn = document.getElementById('retryPaymentBtn');
  if (retryBtn) {
    retryBtn.disabled = true;
    retryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening PayFast...';
  }

  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');
  if (!token) {
    window.location.href = `login.html?redirect=${encodeURIComponent('pricing.html')}`;
    return;
  }

  if (!pendingInfo || !pendingInfo.plan) {
    window.location.href = 'pricing.html';
    return;
  }

  try {
    const origin = window.location.origin;
    const response = await fetch('/api/payfast/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        plan: pendingInfo.plan,
        billingCycle: pendingInfo.billingCycle || 'MONTHLY',
        returnUrl: `${origin}/payment-status.html?payment=complete`,
        cancelUrl: `${origin}/payment-status.html?payment=cancelled`
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Could not restart payment.');

    // Save pending info
    sessionStorage.setItem('vl_pending_payment', JSON.stringify({
      plan: pendingInfo.plan,
      billingCycle: pendingInfo.billingCycle || 'MONTHLY',
      planName: pendingInfo.planName,
      amount: pendingInfo.amount,
      merchantPaymentId: data.merchantPaymentId,
      timestamp: Date.now()
    }));
    sessionStorage.setItem('vl_pending_payment_id', data.merchantPaymentId);

    // Submit PayFast form
    submitFormToPayFast(data);
  } catch (err) {
    if (window.showToast) {
      window.showToast(err.message || 'Could not retry payment. Redirecting to pricing...', 'error');
    }
    setTimeout(() => {
      window.location.href = 'pricing.html';
    }, 1500);
  }
}

/**
 * Action: Cancel transaction
 */
async function cancelTransaction(paymentId) {
  const cancelBtn = document.getElementById('cancelTransactionBtn');
  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cancelling...';
  }

  const token = localStorage.getItem('token') || localStorage.getItem('vendorlink_token');

  if (paymentId && token) {
    try {
      await fetch(`/api/payfast/subscriptions/${encodeURIComponent(paymentId)}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn('Could not cancel pending subscription on backend:', err);
    }
  }

  // Clear pending state
  sessionStorage.removeItem('vl_pending_payment');
  sessionStorage.removeItem('vl_pending_payment_id');

  if (window.showToast) {
    window.showToast('Transaction cancelled.', 'info');
  }

  // Render cancelled confirmation
  const icon = document.getElementById('statusIcon');
  const title = document.getElementById('statusTitle');
  const subtitle = document.getElementById('statusSubtitle');
  const body = document.getElementById('statusBody');
  const actions = document.getElementById('statusActions');

  icon.className = 'status-icon-wrapper status-icon-cancelled';
  icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';

  title.textContent = 'Transaction Cancelled';
  subtitle.textContent = 'The pending subscription transaction has been discarded. You have not been charged.';

  body.innerHTML = `
    <div class="status-warning-banner">
      <i class="fa-solid fa-info-circle"></i>
      <div>
        You can return to the pricing page at any time whenever you are ready to upgrade your plan.
      </div>
    </div>
  `;

  const session = window.getSession ? window.getSession() : null;
  const dashboardUrl = (session && (session.isOrganizer || session.role === 'ORGANIZER' || session.role === 'ADMIN'))
      ? 'organizer-dashboard.html'
      : 'vendor-dashboard.html';

  actions.className = 'payment-actions split';
  actions.innerHTML = `
    <a href="pricing.html" class="btn btn-primary">
      <i class="fa-solid fa-tags"></i> View Pricing Plans
    </a>
    <a href="${dashboardUrl}" class="btn btn-secondary">
      <i class="fa-solid fa-gauge-high"></i> Go to Dashboard
    </a>
  `;
}

/**
 * Backend API helpers
 */
async function fetchSubscriptionStatus(paymentId, token) {
  const res = await fetch(`/api/payfast/subscriptions/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function fetchActiveSubscription(token) {
  const res = await fetch('/api/payfast/subscriptions/active', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

async function tryConfirmSandbox(paymentId, token) {
  try {
    const res = await fetch(`/api/payfast/subscriptions/${encodeURIComponent(paymentId)}/confirm-sandbox`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) return await res.json();
  } catch (e) {
    // ignore
  }
  return null;
}

function submitFormToPayFast(redirect) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = redirect.processUrl;
  form.hidden = true;
  Object.entries(redirect.fields || {}).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function formatPrice(amount) {
  if (amount == null) return 'R 0.00';
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return `R ${amount}`;
  return `R ${num.toFixed(2)}`;
}

function formatDate(isoStr) {
  if (!isoStr) return new Date().toLocaleDateString('en-ZA', { dateStyle: 'medium' });
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}
