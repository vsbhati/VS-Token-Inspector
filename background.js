/**
 * VS Token Inspector — Background Service Worker
 * Captures Bearer tokens from outgoing Authorization headers.
 */

const STORAGE_KEYS = {
  TOKEN: 'vs_bearer_token',
  UPDATED_AT: 'vs_token_updated_at',
};

const BEARER_REGEX = /^Bearer\s+(.+)$/i;

/**
 * Extract and persist Bearer token from request headers.
 * @param {chrome.webRequest.WebRequestHeadersDetails} details
 */
function handleBeforeSendHeaders(details) {
  if (!details.requestHeaders?.length) return;

  const authHeader = details.requestHeaders.find(
    (header) => header.name.toLowerCase() === 'authorization'
  );

  if (!authHeader?.value) return;

  const match = authHeader.value.match(BEARER_REGEX);
  if (!match?.[1]) return;

  const token = match[1].trim();
  if (!token) return;

  chrome.storage.local.set({
    [STORAGE_KEYS.TOKEN]: token,
    [STORAGE_KEYS.UPDATED_AT]: new Date().toISOString(),
  });
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  handleBeforeSendHeaders,
  { urls: ['<all_urls>'] },
  ['requestHeaders', 'extraHeaders']
);

/**
 * Allow popup to request the latest stored token.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'GET_TOKEN') {
    chrome.storage.local.get(
      [STORAGE_KEYS.TOKEN, STORAGE_KEYS.UPDATED_AT],
      (result) => {
        sendResponse({
          token: result[STORAGE_KEYS.TOKEN] || null,
          updatedAt: result[STORAGE_KEYS.UPDATED_AT] || null,
        });
      }
    );
    return true;
  }
});
