// Test Mod entry script: creates its own panel directly in the page.
// The manifest points to this file with `entry`; additional resources, if needed,
// would be fetched and handled by the mod itself.
// No loader UI API or manifest-provided panel is used.
(function () {
  'use strict';

  var existing = document.getElementById('test-mod-panel');
  if (existing) existing.remove();

  var panel = document.createElement('section');
  panel.id = 'test-mod-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Test Mod');
  panel.style.cssText = [
    'position:fixed', 'top:76px', 'right:16px',
    'z-index:2147483647', 'box-sizing:border-box',
    'width:min(300px,calc(100vw - 32px))', 'padding:14px',
    'border:1px solid rgba(255,255,255,.22)', 'border-radius:12px',
    'background:#111827', 'color:#fff',
    'font:13px Roboto,Arial,sans-serif',
    'box-shadow:0 10px 32px rgba(0,0,0,.4)'
  ].join(';');

  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;';

  var title = document.createElement('strong');
  title.textContent = 'Test Mod';

  var close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close panel');
  close.style.cssText = 'border:0;border-radius:6px;background:#334155;color:#fff;width:28px;height:28px;font-size:20px;line-height:1;cursor:pointer;';
  close.addEventListener('click', function () {
    Mod.close();
  });

  var message = document.createElement('p');
  message.textContent = 'Mod loading works.';
  message.style.cssText = 'margin:0;color:#cbd5e1;line-height:1.5;';

  header.appendChild(title);
  header.appendChild(close);
  panel.appendChild(header);
  panel.appendChild(message);
  document.body.appendChild(panel);

  // The loader calls this mod-specific hook when the mod is disabled or removed.
  // Keep it safe to call more than once.
  var closed = false;
  Mod.close = function () {
    if (closed) return;
    closed = true;
    panel.remove();
    console.log('Test Mod cleanup complete.');
  };

  console.log('Test Mod loaded and created its own panel.');
})();
