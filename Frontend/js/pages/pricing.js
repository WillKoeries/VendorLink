/**
 * Pricing page
 * - Vendor / organiser plan tabs
 * - Monthly / annual switch: annual price = monthly price − 20%, rounded
 *   (prices come from each card's data-monthly attribute, not hard-coded here)
 */

const ANNUAL_DISCOUNT = 0.2;

document.addEventListener('DOMContentLoaded', () => {
  setupPlanTabs();
  document.getElementById('annualToggle').addEventListener('change', (e) => updatePrices(e.target.checked));
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

  // pricing.html#organizers opens the organiser plans
  if (window.location.hash === '#organizers') select(1);
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
