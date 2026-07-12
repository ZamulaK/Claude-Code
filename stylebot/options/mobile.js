// Stylebot Mobile patch: collapsible sidebar toggle for narrow screens.
// Lives entirely outside the Vue app (appended to <body>), so it never
// interferes with Stylebot's own rendering.

(function () {
  'use strict';

  var toggle = document.createElement('button');
  toggle.className = 'sb-nav-toggle';
  toggle.type = 'button';
  toggle.title = 'Menu';
  toggle.textContent = '☰';

  var backdrop = document.createElement('div');
  backdrop.className = 'sb-nav-backdrop';

  function setOpen(open) {
    document.body.classList.toggle('sb-nav-open', open);
    toggle.textContent = open ? '✕' : '☰';
  }

  toggle.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('sb-nav-open'));
  });
  backdrop.addEventListener('click', function () {
    setOpen(false);
  });

  // Close the drawer after a section is chosen from the navigation.
  document.addEventListener('click', function (event) {
    if (!document.body.classList.contains('sb-nav-open')) return;
    var item = event.target.closest && event.target.closest('.navigation-list .list-group-item');
    if (item) setOpen(false);
  });

  function attach() {
    document.body.appendChild(toggle);
    document.body.appendChild(backdrop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
