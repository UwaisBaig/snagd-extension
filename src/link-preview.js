/**
 * Snagd Link Preview Module
 * Enriches a saved task with the source page's real
 * title and favicon, since chrome.tabs data is not
 * always reliable for background/prerendered tabs
 */

/**
 * Extracts a clean favicon URL for a given page URL,
 * using Chrome's own favicon service as a reliable
 * fallback when the page's own favicon can't be read
 * @param {string} pageUrl - The page URL
 * @returns {string} Favicon image URL
 */
function getFaviconUrl(pageUrl) {
  try {
    const domain = new URL(pageUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

/**
 * Cleans up a raw tab title, stripping common suffixes
 * like " - YouTube" or site names appended after a dash
 * @param {string} rawTitle - Original tab title
 * @returns {string} Cleaned title
 */
function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  // Strip a trailing " - SiteName" or " | SiteName" pattern
  return rawTitle.replace(/\s*[-|]\s*[^-|]{2,30}$/, '').trim() || rawTitle;
}

/**
 * Builds a preview object for a task at save time
 * @param {Object} tab - chrome.tabs Tab object
 * @returns {Object} Preview data to attach to the task
 */
function buildLinkPreview(tab) {
  return {
    title: cleanTitle(tab.title),
    originalTitle: tab.title,
    favicon: getFaviconUrl(tab.url),
    domain: getDomainOnly(tab.url)
  };
}

/**
 * Extracts just the domain, without protocol or www prefix
 * @param {string} url - Full page URL
 * @returns {string} Clean domain string
 */
function getDomainOnly(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

module.exports = {
  getFaviconUrl,
  cleanTitle,
  buildLinkPreview,
  getDomainOnly
};
