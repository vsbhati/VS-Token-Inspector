/**
 * VS Token Inspector — Popup Controller
 */

const STORAGE_KEYS = {
  TOKEN: 'vs_bearer_token',
  UPDATED_AT: 'vs_token_updated_at',
};

const MASK_VISIBLE_CHARS = 20;
const MASK_SUFFIX = '...';
const TOAST_DURATION_MS = 3200;

const state = {
  token: null,
  updatedAt: null,
  isVisible: false,
};

const DOM = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheDOMElements();
  bindEvents();
  refreshToken();
}

function cacheDOMElements() {
  DOM.statusCard = document.getElementById('statusCard');
  DOM.statusBadge = document.getElementById('statusBadge');
  DOM.statusDot = document.getElementById('statusDot');
  DOM.statusText = document.getElementById('statusText');
  DOM.tokenField = document.getElementById('tokenField');
  DOM.copyInlineBtn = document.getElementById('copyInlineBtn');
  DOM.toggleVisibilityBtn = document.getElementById('toggleVisibilityBtn');
  DOM.iconEye = document.getElementById('iconEye');
  DOM.iconEyeOff = document.getElementById('iconEyeOff');
  DOM.copyBtn = document.getElementById('copyBtn');
  DOM.refreshBtn = document.getElementById('refreshBtn');
  DOM.infoType = document.getElementById('infoType');
  DOM.infoLength = document.getElementById('infoLength');
  DOM.infoUpdated = document.getElementById('infoUpdated');
  DOM.toastContainer = document.getElementById('toastContainer');
}

function bindEvents() {
  DOM.copyBtn.addEventListener('click', copyToken);
  DOM.copyInlineBtn.addEventListener('click', copyToken);
  DOM.refreshBtn.addEventListener('click', refreshToken);
  DOM.toggleVisibilityBtn.addEventListener('click', toggleTokenVisibility);
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= MASK_VISIBLE_CHARS) return token;
  return `${token.slice(0, MASK_VISIBLE_CHARS)}${MASK_SUFFIX}`;
}

function formatUpdatedTime(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function renderUI() {
  const hasToken = Boolean(state.token);

  DOM.statusBadge.className = 'status-badge';
  if (hasToken) {
    DOM.statusBadge.classList.add('status-badge--success');
    DOM.statusText.textContent = 'Bearer Token Detected';
  } else {
    DOM.statusBadge.classList.add('status-badge--error');
    DOM.statusText.textContent = 'No Bearer Token Found';
  }

  if (hasToken) {
    DOM.tokenField.value = state.isVisible
      ? state.token
      : maskToken(state.token);
    DOM.tokenField.classList.remove('token-field--empty');
    DOM.tokenField.placeholder = '';
  } else {
    DOM.tokenField.value = '';
    DOM.tokenField.placeholder = 'No bearer token captured yet…';
    DOM.tokenField.classList.add('token-field--empty');
  }

  DOM.toggleVisibilityBtn.disabled = !hasToken;
  DOM.toggleVisibilityBtn.setAttribute('aria-pressed', String(state.isVisible));
  DOM.toggleVisibilityBtn.setAttribute(
    'aria-label',
    state.isVisible ? 'Hide token' : 'Show token'
  );
  DOM.iconEye.classList.toggle('hidden', state.isVisible);
  DOM.iconEyeOff.classList.toggle('hidden', !state.isVisible);

  DOM.copyBtn.disabled = !hasToken;
  DOM.copyInlineBtn.disabled = !hasToken;

  DOM.infoType.textContent = hasToken ? 'Bearer' : '—';
  DOM.infoLength.textContent = hasToken ? String(state.token.length) : '—';
  DOM.infoUpdated.textContent = formatUpdatedTime(state.updatedAt);
}

async function refreshToken() {
  DOM.refreshBtn.classList.add('btn--loading');
  DOM.refreshBtn.disabled = true;

  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.UPDATED_AT,
    ]);

    state.token = result[STORAGE_KEYS.TOKEN] || null;
    state.updatedAt = result[STORAGE_KEYS.UPDATED_AT] || null;
    state.isVisible = false;
    renderUI();

    if (!state.token) {
      showErrorToast();
    }
  } catch (error) {
    console.error('[VS Token Inspector] refreshToken failed:', error);
    state.token = null;
    state.updatedAt = null;
    renderUI();
    showErrorToast();
  } finally {
    DOM.refreshBtn.classList.remove('btn--loading');
    DOM.refreshBtn.disabled = false;
  }
}

function toggleTokenVisibility() {
  if (!state.token) return;
  state.isVisible = !state.isVisible;
  renderUI();
}

async function copyToken() {
  if (!state.token) {
    showErrorToast();
    return;
  }

  try {
    await navigator.clipboard.writeText(state.token);
    showSuccessToast();
  } catch (error) {
    console.error('[VS Token Inspector] copyToken failed:', error);

    try {
      DOM.tokenField.value = state.token;
      DOM.tokenField.select();
      document.execCommand('copy');
      DOM.tokenField.value = state.isVisible
        ? state.token
        : maskToken(state.token);
      showSuccessToast();
    } catch {
      showErrorToast();
    }
  }
}

function showSuccessToast() {
  showToast({
    type: 'success',
    message: 'Bearer token copied successfully',
    icon: `
      <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    `,
  });
}

function showErrorToast() {
  showToast({
    type: 'error',
    message: 'Bearer token not found',
    icon: `
      <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    `,
  });
}

function showToast({ type, message, icon }) {
  DOM.toastContainer.querySelectorAll('.toast').forEach(removeToast);

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `${icon}<span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);

  const timer = setTimeout(() => removeToast(toast), TOAST_DURATION_MS);
  toast._timer = timer;
}

function removeToast(toast) {
  if (!toast?.isConnected) return;
  clearTimeout(toast._timer);
  toast.classList.add('toast--leaving');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}
