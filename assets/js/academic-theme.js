/* Apply the theme before the stylesheet paints; remember only an explicit choice. */
(function () {
  'use strict';
  var key = 'adam-umra-theme';
  var root = document.documentElement;
  var system = window.matchMedia('(prefers-color-scheme: dark)');
  var choice = null;

  function valid(value) {
    return value === 'dark' || value === 'light' ? value : null;
  }

  try {
    choice = valid(window.localStorage.getItem(key));
  } catch (error) {
    // The toggle still works when browser privacy settings block storage.
  }

  function apply() {
    var theme = choice || (system.matches ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    var button = document.getElementById('theme-toggle');
    if (button) {
      button.setAttribute('aria-pressed', String(theme === 'dark'));
      button.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  apply();
  system.addEventListener('change', function () {
    if (!choice) apply();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) {
      choice = valid(event.newValue);
      apply();
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    apply();
    button.hidden = false;
    button.addEventListener('click', function () {
      choice = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(key, choice);
      } catch (error) {
        // Retain the current choice for this page even without persistence.
      }
      apply();
    });
  });
}());
