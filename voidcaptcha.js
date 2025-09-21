// voidcaptcha.js – ULTRA WITHOUT POPUP
(function (global) {
  "use strict";

  const voidCaptcha = {};

  const COLORS = ["red", "blue"];
  const MIN_WORD_LENGTH = 12;
  const MAX_TRIES_BEFORE_TIMEOUT = 3;
  const INITIAL_COOLDOWN_MS = 5000;
  const MAX_COOLDOWN_MS = 60 * 60 * 1000;
  const FORBIDDEN_CENTER_RATIO = 0.20;
  const EDGE_MARGIN_RATIO = 0.25;
  const MIN_HOVER_MS = 200;
  const MIN_KEY_INTERVAL_MS = 30;
  const MOUSE_FAST_DT_MS = 20;
  const MOUSE_FAST_DXY_PX = 50;
  const SCROLL_JUMP_PX = 500;
  const PERFECT_TYPE_SUS_LIMIT = 3;

  let tries = 0;
  let cooldown = INITIAL_COOLDOWN_MS;
  let blockedUntil = 0;
  let verified = false;
  let countdownTimer = null;

  let targetBoxColor = null;
  let requiredWord = generateWord(MIN_WORD_LENGTH);

  let suspiciousScore = 0;
  let lastMouseX = 0, lastMouseY = 0, lastMoveTime = Date.now();
  let hoverStartTime = 0;
  let lastKeyTime = 0;
  let lastScrollY = window.scrollY;

  let perfectTypeCount = 0;

  function generateWord(len) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let w = "";
    for (let i = 0; i < len; i++) w += chars[(Math.random() * chars.length) | 0];
    return w;
  }

  function nowMs() { return Date.now(); }

  function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

  function humanTryAgainMessage() {
    const msgs = ["Try again!", "Whoops—again please.", "One more time.", "Give it another go.", "Let’s try that once more.", "Please try again.", "Almost! Try again.", "Retry."];
    return msgs[(Math.random() * msgs.length) | 0];
  }

  function setExpCooldown() {
    blockedUntil = nowMs() + cooldown;
    cooldown = clamp(cooldown * 2, INITIAL_COOLDOWN_MS, MAX_COOLDOWN_MS);
  }

  // ====== GLOBAL HEURISTICS ======
  document.addEventListener("mousemove", (e) => {
    const dx = Math.abs(e.clientX - lastMouseX);
    const dy = Math.abs(e.clientY - lastMouseY);
    const dt = nowMs() - lastMoveTime;
    if (dt < MOUSE_FAST_DT_MS && (dx > MOUSE_FAST_DXY_PX || dy > MOUSE_FAST_DXY_PX)) suspiciousScore++;
    else if (dx < 1 && dy < 1) suspiciousScore++;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    lastMoveTime = nowMs();
  });

  document.addEventListener("mouseover", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.vcBox === "1") hoverStartTime = nowMs();
  });

  document.addEventListener("keydown", () => {
    const t = nowMs();
    if (lastKeyTime && t - lastKeyTime < MIN_KEY_INTERVAL_MS) suspiciousScore++;
    lastKeyTime = t;
  });

  document.addEventListener("scroll", () => {
    if (Math.abs(window.scrollY - lastScrollY) > SCROLL_JUMP_PX) suspiciousScore++;
    lastScrollY = window.scrollY;
  });

  // ====== ULTRA CAPTCHA ======
  voidCaptcha.init = function () {
    if (document.getElementById("voidcaptcha-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "voidcaptcha-overlay";
    overlay.style.cssText = "position: fixed; inset:0; background:#000; color:#eee; display:flex; align-items:center; justify-content:center; z-index:2147483647; flex-direction:column;";

    const card = document.createElement("div");
    card.style.cssText = "background:#111214; color:#eee; padding:26px; border-radius:14px; box-shadow:0 18px 60px rgba(0,0,0,0.7); width:min(95%,720px); display:flex; flex-direction:column; align-items:center; text-align:center;";

    const title = document.createElement("h2");
    title.textContent = "VOIDCAPTCHA MAXIMUM";
    title.style.margin = "0 0 12px 0";

    const cbRow = document.createElement("div");
    cbRow.style.cssText = "display:flex;align-items:center;gap:8px;margin:10px 0 14px 0;";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.id = "voidcaptcha-checkbox"; checkbox.style.width = "22px"; checkbox.style.height = "22px"; checkbox.style.cursor = "pointer";
    const label = document.createElement("label"); label.htmlFor = "voidcaptcha-checkbox"; label.textContent = "I'm not a robot"; label.style.cursor = "pointer";
    cbRow.appendChild(checkbox); cbRow.appendChild(label);

    const instruction = document.createElement("p"); instruction.style.cssText = "margin:10px 0 10px 0;color:#cfcfcf;font-size:14px;";
    const status = document.createElement("div"); status.style.cssText = "font-weight:700;min-height:24px;margin-top:6px;";

    const boxesWrap = document.createElement("div"); boxesWrap.style.cssText = "display:none;justify-content:center;gap:12px;margin:10px 0 8px 0;flex-wrap:wrap;";

    const wordContainer = document.createElement("div"); wordContainer.style.cssText = "position:relative;width:min(560px,90%);margin:10px 0;";
    const wordInput = document.createElement("input"); wordInput.type = "text"; wordInput.autocomplete = "off"; wordInput.spellcheck = false; wordInput.style.cssText = "width:100%;padding:10px 12px;font-size:15px;border-radius:10px;border:1px solid #888;background:#0f1114;color:#eee;";
    const wordGhost = document.createElement("div"); wordGhost.textContent = requiredWord; wordGhost.style.cssText = "position:absolute;top:50%;left:12px;transform:translateY(-50%); color:#555;font-size:15px;pointer-events:none;user-select:none;";
    wordContainer.appendChild(wordInput); wordContainer.appendChild(wordGhost);

    card.appendChild(title); card.appendChild(cbRow); card.appendChild(instruction); card.appendChild(boxesWrap); card.appendChild(wordContainer); card.appendChild(status);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function makeBox(color) {
      const el = document.createElement("div");
      el.dataset.vcBox = "1"; el.dataset.color = color;
      el.style.cssText = `width:140px; height:140px; border-radius:14px; background:${color}; cursor:pointer; box-shadow:0 10px 28px rgba(0,0,0,0.5); transition: transform .12s ease, filter .12s ease;`;
      el.addEventListener("mouseenter", () => hoverStartTime = nowMs());
      el.addEventListener("mouseleave", () => hoverStartTime = 0);
      el.addEventListener("click", (e) => onBoxClick(e, el));
      boxesWrap.appendChild(el);
      return el;
    }

    const redBox = makeBox("red");
    const blueBox = makeBox("blue");

    function setTarget() {
      targetBoxColor = COLORS[(Math.random() * COLORS.length) | 0];
      instruction.textContent = `Click the ${targetBoxColor} box AND type the word above.`;
    }

    function failAttempt(msg) {
      tries++;
      status.textContent = msg || humanTryAgainMessage();
      if (tries >= MAX_TRIES_BEFORE_TIMEOUT) {
        setExpCooldown();
        redBox.style.pointerEvents = "none"; blueBox.style.pointerEvents = "none";
        wordInput.disabled = true;
        clearInterval(countdownTimer);
        countdownTimer = setInterval(() => {
          const left = Math.max(0, Math.ceil((blockedUntil - nowMs()) / 1000));
          instruction.textContent = `⏳ Wait ${left}s...`;
          if (left <= 0) {
            clearInterval(countdownTimer);
            tries = 0;
            redBox.style.pointerEvents = "auto"; blueBox.style.pointerEvents = "auto";
            wordInput.disabled = false;
            instruction.textContent = "";
            setTarget();
          }
        }, 300);
      } else setTimeout(() => { status.textContent = ""; setTarget(); }, 350);
    }

    function pass() { verified = true; overlay.style.transition = "opacity .36s ease"; overlay.style.opacity = "0"; setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 380); checkbox.checked = true; checkbox.disabled = true; wordInput.disabled = true; }

    function onBoxClick(e, el) {
      if (nowMs() < blockedUntil) return;
      if (suspiciousScore > 5) { suspiciousScore = 0; return failAttempt(); }
      if (!hoverStartTime || nowMs() - hoverStartTime < MIN_HOVER_MS) return failAttempt();

      const rect = el.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const centerX = rect.width / 2, centerY = rect.height / 2;
      const forbiddenRadius = rect.width * FORBIDDEN_CENTER_RATIO;
      if (Math.hypot(clickX - centerX, clickY - centerY) < forbiddenRadius) return failAttempt();
      const edgeMargin = rect.width * EDGE_MARGIN_RATIO;
      const nearXEdge = clickX < edgeMargin || clickX > rect.width - edgeMargin;
      const nearYEdge = clickY < edgeMargin || clickY > rect.height - edgeMargin;
      if (!(nearXEdge || nearYEdge)) return failAttempt();
      if (wordInput.value !== requiredWord) return failAttempt();
      if (el.dataset.color === targetBoxColor) pass(); else failAttempt();
    }

    wordInput.addEventListener("paste", (e) => { e.preventDefault(); failAttempt(); });
    wordInput.addEventListener("input", () => {
      wordGhost.style.display = "block";
      if (wordInput.value === requiredWord) { perfectTypeCount++; if (perfectTypeCount >= PERFECT_TYPE_SUS_LIMIT) return failAttempt(); }
    });

    checkbox.addEventListener("change", () => {
      if (verified) { checkbox.checked = true; checkbox.disabled = true; return; }
      if (checkbox.checked) { boxesWrap.style.display = "flex"; wordInput.disabled = false; setTarget(); }
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", voidCaptcha.init);
  else voidCaptcha.init();

  global.voidCaptcha = voidCaptcha;

})(window);
