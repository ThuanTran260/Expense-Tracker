// Khởi tạo theme TRƯỚC paint để chống FOUC (flash of wrong theme).
// Là file external (không inline) để tương thích CSP script-src 'self'.
(function () {
  var t = localStorage.getItem('expense_tracker_theme');
  if (!t) {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
})();
