(function () {
  'use strict';

  var MOD_ID = 'invincible-flight';
  var existing = document.getElementById(MOD_ID + '-root');
  if (existing) existing.remove();

  var events = new AbortController();
  var closed = false;
  var enabled = false;
  var joystickPointer = null;
  var boostPointer = null;
  var boostHeld = false;
  var axis = { x: 0, y: 0 };
  var raf = 0;
  var lastFrameTime = 0;
  var currentSpeed = 0;
  var lastAim = null;
  var sentMove = false;
  var sentBoost = false;
  var savedSpeed = window.__playerSpeed;
  var hadSavedSpeed = Object.prototype.hasOwnProperty.call(window, '__playerSpeed');
  var BASE_SPEED = Number(savedSpeed) > 0 ? Number(savedSpeed) : 8;
  var MAX_FLIGHT_SPEED = 260;
  var ACCELERATION = 1800;
  var BRAKING = 1400;

  var root = document.createElement('div');
  root.id = MOD_ID + '-root';
  root.innerHTML =
    '<button class="if-toggle" type="button" aria-pressed="false">FLIGHT: OFF</button>' +
    '<div class="if-stick" role="group" aria-label="Flight direction joystick">' +
      '<div class="if-stick-ring"><div class="if-stick-knob"></div></div>' +
      '<span class="if-stick-label">MOVE</span>' +
    '</div>' +
    '<button class="if-boost" type="button" aria-pressed="false">' +
      '<span class="if-boost-icon">✦</span><span>BOOST</span>' +
    '</button>' +
    '<div class="if-status" aria-live="polite">Flight controls ready</div>' +
    '<div class="if-trails" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>';

  var style = document.createElement('style');
  style.id = MOD_ID + '-style';
  style.textContent = `
    #${MOD_ID}-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:Arial,sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none}
    #${MOD_ID}-root *{box-sizing:border-box}
    #${MOD_ID}-root button{font:700 12px Arial,sans-serif;color:#fff;letter-spacing:1px;cursor:pointer;touch-action:none}
    #${MOD_ID}-root .if-toggle{pointer-events:auto;position:absolute;left:18px;bottom:214px;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#242c3e,#101827);box-shadow:0 5px 20px #0008}
    #${MOD_ID}-root .if-toggle[aria-pressed=true]{background:linear-gradient(135deg,#1688d8,#164e9b);box-shadow:0 0 22px #38bdf899}
    #${MOD_ID}-root .if-stick{pointer-events:auto;position:absolute;left:22px;bottom:24px;width:164px;height:164px;display:grid;place-items:center}
    #${MOD_ID}-root .if-stick-ring{width:150px;height:150px;border:2px solid #ffffff55;border-radius:50%;background:radial-gradient(circle,#ffffff18,#0b122b66 70%);box-shadow:inset 0 0 24px #60a5fa22,0 6px 22px #0007;display:grid;place-items:center}
    #${MOD_ID}-root .if-stick-knob{width:58px;height:58px;border:2px solid #dbeafeaa;border-radius:50%;background:linear-gradient(145deg,#60a5fa,#1d4ed8);box-shadow:0 4px 16px #0008,0 0 16px #38bdf866;transform:translate(0,0)}
    #${MOD_ID}-root .if-stick-label{position:absolute;bottom:3px;font-size:9px;letter-spacing:2px;color:#dbeafeaa;text-shadow:0 1px 3px #000}
    #${MOD_ID}-root .if-boost{pointer-events:auto;position:absolute;right:24px;bottom:42px;width:104px;height:104px;border:2px solid #fef08a99;border-radius:50%;background:radial-gradient(circle at 35% 25%,#fde68a,#f97316 60%,#9a3412);box-shadow:0 0 22px #fb923c77,inset 0 0 14px #fff6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
    #${MOD_ID}-root .if-boost .if-boost-icon{font-size:25px;line-height:1}
    #${MOD_ID}-root .if-boost[aria-pressed=true]{transform:scale(.94);filter:brightness(1.25);box-shadow:0 0 34px #facc15}
    #${MOD_ID}-root .if-status{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:10px;letter-spacing:1px;color:#dbeafecc;text-shadow:0 1px 4px #000;white-space:nowrap}
    #${MOD_ID}-root .if-trails{position:absolute;left:50%;top:50%;width:1px;height:1px;opacity:0;pointer-events:none}
    #${MOD_ID}-root .if-trails i{position:absolute;width:3px;height:50px;border-radius:9px;background:linear-gradient(transparent,#7dd3fc,transparent);transform:rotate(55deg);animation:if-wind .7s linear infinite}
    #${MOD_ID}-root .if-trails i:nth-child(1){left:-90px;top:-35px;animation-delay:0s}
    #${MOD_ID}-root .if-trails i:nth-child(2){left:-65px;top:15px;animation-delay:.2s}
    #${MOD_ID}-root .if-trails i:nth-child(3){left:65px;top:-50px;animation-delay:.1s}
    #${MOD_ID}-root .if-trails i:nth-child(4){left:90px;top:8px;animation-delay:.35s}
    #${MOD_ID}-root .if-trails i:nth-child(5){left:0;top:40px;animation-delay:.25s}
    #${MOD_ID}-root.if-active .if-trails{opacity:.65}
    #${MOD_ID}-root.if-boosting .if-trails{opacity:1;transform:scale(1.45)}
    @keyframes if-wind{from{translate:0 -22px;opacity:0}50%{opacity:.9}to{translate:0 22px;opacity:0}}
    @media(max-width:520px){
      #${MOD_ID}-root .if-stick{left:12px;bottom:18px;width:142px;height:142px}
      #${MOD_ID}-root .if-stick-ring{width:130px;height:130px}
      #${MOD_ID}-root .if-stick-knob{width:52px;height:52px}
      #${MOD_ID}-root .if-toggle{left:14px;bottom:174px}
      #${MOD_ID}-root .if-boost{right:16px;bottom:30px;width:90px;height:90px}
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(root);

  var toggle = root.querySelector('.if-toggle');
  var stick = root.querySelector('.if-stick');
  var ring = root.querySelector('.if-stick-ring');
  var knob = root.querySelector('.if-stick-knob');
  var boost = root.querySelector('.if-boost');
  var status = root.querySelector('.if-status');

  function setStatus(message) {
    status.textContent = message;
  }

  function getController() {
    var stage = window.__stageControl;
    if (!stage || !stage.gameStarted || !stage.myPlayer || !stage.broadcaster) return null;
    var broadcaster = stage.broadcaster;
    if (typeof broadcaster.aim !== 'function' ||
        typeof broadcaster.move !== 'function' ||
        typeof broadcaster.boost !== 'function') return null;
    return { stage: stage, player: stage.myPlayer, broadcaster: broadcaster };
  }

  function sendMove(value) {
    var controller = getController();
    if (!controller || sentMove === value) return;
    sentMove = value;
    try { controller.broadcaster.move(value); } catch (error) {
      setStatus('Movement control unavailable');
    }
  }

  function sendBoost(value) {
    var controller = getController();
    if (!controller || sentBoost === value) return;
    sentBoost = value;
    try { controller.broadcaster.boost(value); } catch (error) {
      setStatus('Boost control unavailable');
    }
  }

  function aim() {
    if (!enabled) return;
    var controller = getController();
    if (!controller) return;
    var magnitude = Math.hypot(axis.x, axis.y);
    if (magnitude < 0.04) return;
    var angle = Math.atan2(axis.y, axis.x) * 180 / Math.PI;
    if (lastAim === null || Math.abs(((angle - lastAim + 540) % 360) - 180) > 0.5) {
      lastAim = angle;
      try { controller.broadcaster.aim(angle); } catch (error) {
        setStatus('Direction control unavailable');
      }
    }
  }

  function restoreSpeed() {
    if (hadSavedSpeed) window.__playerSpeed = savedSpeed;
    else {
      try { delete window.__playerSpeed; } catch (_) { window.__playerSpeed = undefined; }
    }
  }

  function setAxisFromPointer(event) {
    var rect = ring.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var max = rect.width * 0.38;
    var dx = event.clientX - cx;
    var dy = event.clientY - cy;
    var length = Math.hypot(dx, dy);
    if (length > max) {
      dx = dx / length * max;
      dy = dy / length * max;
    }
    axis.x = dx / max;
    axis.y = dy / max;
    knob.style.transform = 'translate(' + (axis.x * max) + 'px,' + (axis.y * max) + 'px)';
    aim();
  }

  function resetStick() {
    joystickPointer = null;
    axis.x = 0;
    axis.y = 0;
    knob.style.transform = 'translate(0,0)';
  }

  function stopBoost() {
    if (!boostHeld) return;
    boostHeld = false;
    boost.setAttribute('aria-pressed', 'false');
    root.classList.remove('if-boosting');
    sendBoost(false);
  }

  function setEnabled(value) {
    enabled = !!value;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'FLIGHT: ON' : 'FLIGHT: OFF';
    root.classList.toggle('if-active', enabled);
    if (!enabled) {
      resetStick();
      stopBoost();
      sendMove(false);
      currentSpeed = 0;
      lastAim = null;
      restoreSpeed();
      setStatus('Flight controls paused');
    } else {
      lastFrameTime = 0;
      setStatus(getController() ? 'Flight controls active' : 'Join a game to fly');
      aim();
    }
  }

  toggle.addEventListener('click', function () {
    setEnabled(!enabled);
  }, { signal: events.signal });

  stick.addEventListener('pointerdown', function (event) {
    if (!enabled || joystickPointer !== null) return;
    event.preventDefault();
    joystickPointer = event.pointerId;
    try { stick.setPointerCapture(event.pointerId); } catch (_) {}
    setAxisFromPointer(event);
  }, { signal: events.signal });

  stick.addEventListener('pointermove', function (event) {
    if (event.pointerId !== joystickPointer) return;
    event.preventDefault();
    setAxisFromPointer(event);
  }, { signal: events.signal });

  function releaseStick(event) {
    if (event.pointerId !== joystickPointer) return;
    resetStick();
  }
  stick.addEventListener('pointerup', releaseStick, { signal: events.signal });
  stick.addEventListener('pointercancel', releaseStick, { signal: events.signal });
  stick.addEventListener('lostpointercapture', releaseStick, { signal: events.signal });

  boost.addEventListener('pointerdown', function (event) {
    if (!enabled || boostHeld) return;
    event.preventDefault();
    boostPointer = event.pointerId;
    try { boost.setPointerCapture(event.pointerId); } catch (_) {}
    boostHeld = true;
    boost.setAttribute('aria-pressed', 'true');
    root.classList.add('if-boosting');
    sendBoost(true);
    aim();
    setStatus('Boost engaged');
  }, { signal: events.signal });

  function releaseBoost(event) {
    if (boostPointer !== null && event.pointerId !== boostPointer) return;
    boostPointer = null;
    stopBoost();
  }
  boost.addEventListener('pointerup', releaseBoost, { signal: events.signal });
  boost.addEventListener('pointercancel', releaseBoost, { signal: events.signal });
  boost.addEventListener('lostpointercapture', releaseBoost, { signal: events.signal });

  window.addEventListener('blur', function () {
    resetStick();
    stopBoost();
  }, { signal: events.signal });

  function frame(now) {
    if (closed) return;
    if (enabled) {
      var controller = getController();
      if (controller) {
        var dt = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.05) : 0;
        lastFrameTime = now;
        var magnitude = Math.min(1, Math.hypot(axis.x, axis.y));
        var targetSpeed = magnitude > 0.04 ? MAX_FLIGHT_SPEED * magnitude : 0;
        var rate = targetSpeed > currentSpeed ? ACCELERATION : BRAKING;
        var difference = targetSpeed - currentSpeed;
        var change = rate * dt;
        currentSpeed += Math.max(-change, Math.min(change, difference));
        if (magnitude > 0.04) aim();

        var speedRatio = Math.max(0.01, Math.min(1, currentSpeed / MAX_FLIGHT_SPEED));
        window.__playerSpeed = BASE_SPEED * speedRatio;

        if (currentSpeed > 0.8) {
          sendMove(true);
        } else {
          currentSpeed = 0;
          sendMove(false);
        }
        sendBoost(boostHeld);

        var p = controller.player;
        setStatus('FLIGHT ACTIVE  ·  X ' + Math.round(p.x) +
          '  Y ' + Math.round(p.y) +
          '  SPEED ' + Math.round(speedRatio * 100) + '%');
      } else {
        lastFrameTime = now;
        setStatus('Waiting for active player…');
      }
    } else {
      lastFrameTime = 0;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  Mod.close = function () {
    if (closed) return;
    closed = true;
    setEnabled(false);
    events.abort();
    cancelAnimationFrame(raf);
    root.remove();
    style.remove();
    console.log('[Invincible Flight] cleaned up');
  };

  setStatus(canvas ? 'Ready. Enable flight to begin.' : 'Waiting for game canvas…');
  console.log('[Invincible Flight] loaded');
})();
