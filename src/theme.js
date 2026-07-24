/**
 * Snagd Theme Module
 * Manages Light / Dark / Auto theme state
 * and applies it to the popup/settings UI
 */

const THEME_KEY = 'theme_preference';

const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

/**
 * Gets the saved theme preference,
 * defaulting to AUTO if never set
 * @returns {Promise<string>} One of THEME values
 */
async function getThemePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([THEME_KEY], (result) => {
      resolve(result[THEME_KEY] || THEME.AUTO);
    });
  });
}

/**
 * Saves the theme preference
 * @param {string} theme - One of THEME values
 */
async function setThemePreference(theme) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [THEME_KEY]: theme }, resolve);
  });
}

/**
 * Resolves AUTO down to an actual light/dark
 * value based on the system preference
 * @param {string} preference - Saved THEME value
 * @returns {string} 'light' or 'dark'
 */
function resolveEffectiveTheme(preference) {
  if (preference !== THEME.AUTO) return preference;

  const prefersDark = window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return prefersDark ? THEME.DARK : THEME.LIGHT;
}

/**
 * Applies the resolved theme to the document
 * by toggling a data attribute used in CSS
 * @param {string} effectiveTheme - 'light' or 'dark'
 */
function applyTheme(effectiveTheme) {
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

/**
 * Sets up a listener so AUTO mode updates live
 * if the user changes their OS theme while the
 * popup is open
 */
function watchSystemThemeChanges() {
  if (!window.matchMedia) return;

  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', async () => {
      const preference = await getThemePreference();
      if (preference === THEME.AUTO) {
        applyTheme(resolveEffectiveTheme(preference));
      }
    });
}

module.exports = {
  THEME,
  getThemePreference,
  setThemePreference,
  resolveEffectiveTheme,
  applyTheme,
  watchSystemThemeChanges
};
