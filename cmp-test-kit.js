/* ============================================================================
 * Shared CMP test kit
 * Used by all test pages. Each page sets `window.UC_TEST_CASE` BEFORE loading
 * this script:
 *
 *   window.UC_TEST_CASE = {
 *     name: 'Show on all pages',
 *     expectPrivacyButton: true,   // true = button must render, false = must NOT
 *   };
 *
 * Render the toolbar with: ucRenderToolbar('#toolbar', '#result')
 * ========================================================================== */
(function () {
  var CASE = window.UC_TEST_CASE || { name: 'unnamed', expectPrivacyButton: true };
  var resultEl = null;

  function out(text, cls) {
    if (!resultEl) return;
    resultEl.textContent = text;
    resultEl.className = cls || '';
  }
  function log(msg) {
    if (!resultEl) return;
    if (resultEl.textContent === 'Waiting for CMP to load…') resultEl.textContent = '';
    resultEl.textContent += msg + '\n';
  }
  function verdict(lines) {
    var joined = lines.join('');
    out(lines.join('\n'), joined.indexOf('FAIL') > -1 ? 'fail' : joined.indexOf('WARN') > -1 ? 'warn' : 'ok');
  }

  /* --- DOM helpers -------------------------------------------------------- */
  function getCmpRoot() {
    return document.getElementById('usercentrics-cmp-ui');
  }
  function getShadow() {
    var r = getCmpRoot();
    return r && r.shadowRoot ? r.shadowRoot : null;
  }
  // The Privacy Button renders as <button id="uc-privacy-button"> inside the
  // shadow root (see partials/privacyButton.mustache, testIds.ts CMP_PRIVACY_BUTTON).
  function getPrivacyButtonEl() {
    var s = getShadow();
    return s ? s.querySelector('#uc-privacy-button') : null;
  }
  function isVisible(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  /* --- Checks ------------------------------------------------------------- */
  function checkInit() {
    var root = getCmpRoot();
    var lines = [];
    lines.push('Test case:      ' + CASE.name);
    lines.push('window.UC_UI:   ' + (window.UC_UI ? 'OK exists' : 'FAIL not found'));
    lines.push('window.__ucCmp: ' + (window.__ucCmp ? 'OK exists' : 'FAIL not found'));
    lines.push('#usercentrics-cmp-ui: ' + (root ? 'OK in DOM' : 'FAIL not in DOM'));
    lines.push('shadowRoot:           ' + (getShadow() ? 'OK present' : 'FAIL missing'));
    verdict(lines);
  }

  // Core check: is the floating Privacy Button rendered as expected?
  function checkPrivacyButton() {
    var shadow = getShadow();
    var lines = [];
    if (!shadow) {
      out('FAIL — #usercentrics-cmp-ui / shadowRoot not found. CMP did not render at all.', 'fail');
      return;
    }
    var btn = getPrivacyButtonEl();
    var visible = isVisible(btn);
    lines.push('Expecting Privacy Button: ' + (CASE.expectPrivacyButton ? 'YES (must render)' : 'NO (must stay hidden)'));
    lines.push('#uc-privacy-button in shadow DOM: ' + (btn ? 'found' : 'NOT found'));
    lines.push('Privacy Button visible:           ' + (btn ? (visible ? 'yes' : 'no (0×0 box)') : 'n/a'));
    lines.push('');

    if (CASE.expectPrivacyButton) {
      if (btn && visible) {
        lines.push('>>> PASS — Privacy Button is rendered and visible.');
      } else if (btn && !visible) {
        lines.push('>>> FAIL — button element exists but is not visible.');
      } else {
        lines.push('>>> FAIL — Privacy Button NOT rendered');
        lines.push('    (US framework + Show CMP disabled — the button is suppressed).');
      }
    } else {
      if (btn && visible) {
        lines.push('>>> FAIL — Privacy Button is visible but this page is NOT in the');
        lines.push('    configured page paths. "Show on specific pages" filter did not apply.');
      } else {
        lines.push('>>> PASS — Privacy Button correctly hidden on this non-listed page.');
      }
    }
    verdict(lines);
  }

  // Privacy Trigger check — reports which trigger layout the CMP rendered.
  // Privacy Button layout -> floating #uc-privacy-button.
  // Privacy Link layout   -> no floating button; integrator places a custom
  //                          <a onClick="__ucCmp.showSecondLayer()"> link.
  function checkPrivacyTrigger() {
    var shadow = getShadow();
    var lines = [];
    if (!shadow) {
      out('FAIL — CMP shadowRoot not found, cannot inspect Privacy Trigger.', 'fail');
      return;
    }
    var btn = getPrivacyButtonEl();
    var hasShadowContent = (shadow.innerHTML || '').trim().length > 0;
    var customLink = document.querySelector('[data-uc-privacy-link]');

    lines.push('--- Privacy Trigger configuration (observed) ---');
    if (btn) {
      lines.push('Layout detected: PRIVACY BUTTON');
      lines.push('  floating #uc-privacy-button is present in the shadow DOM.');
      var aria = btn.getAttribute('aria-label');
      lines.push('  aria-label: ' + (aria || '(none)'));
      lines.push('  data-action: ' + (btn.getAttribute('data-action') || '') +
        ' / ' + (btn.getAttribute('data-action-type') || ''));
      lines.push('');
      lines.push('>>> Privacy Trigger = Privacy Button — rendered OK.');
      verdict(lines);
      return;
    }

    // No floating button — either Privacy Link layout, or trigger disabled, or the bug.
    lines.push('Layout detected: NO floating Privacy Button.');
    lines.push('  shadowRoot has content: ' + (hasShadowContent ? 'yes' : 'no (closedView likely "none")'));
    lines.push('  custom Privacy Link on page ([data-uc-privacy-link]): ' + (customLink ? 'present' : 'absent'));
    lines.push('');
    lines.push('Compare against the Admin Interface "Privacy Trigger" section:');
    lines.push('  • If Layout = Privacy Link  -> expected (use the custom link below).');
    lines.push('  • If Privacy Trigger is OFF -> expected (no trigger at all).');
    lines.push('  • If Layout = Privacy Button -> FAIL: the button is suppressed.');
    out(lines.join('\n'), 'warn');
  }

  // With "Show CMP on page load" disabled the first-layer banner must NOT auto-open.
  function checkBannerHidden() {
    var shadow = getShadow();
    if (!shadow) {
      out('FAIL — CMP not in DOM.', 'fail');
      return;
    }
    var dialog = shadow.querySelector('[role="dialog"], [class*="first-layer"], [class*="firstLayer"]');
    if (dialog && isVisible(dialog)) {
      out('WARN — a first-layer / dialog is visible. With "Show CMP on page load"\n' +
        'disabled the banner should NOT auto-open. Verify the configuration.', 'warn');
    } else {
      out('OK — no first-layer banner auto-opened (expected with Show CMP disabled).', 'ok');
    }
  }

  // Reports the current path and how the "Show on specific pages" matcher treats it.
  function checkPagePath() {
    var lines = [];
    lines.push('Current location:');
    lines.push('  href:     ' + location.href);
    lines.push('  pathname: ' + location.pathname);
    lines.push('');
    lines.push('"Show on specific pages" matching rule (helpers/matchesPage.ts):');
    lines.push('  • a configured path matches when the current pathname equals it,');
    lines.push('    or starts with it at a "/" segment boundary.');
    lines.push('  • "/privacy" matches /privacy and /privacy/x — NOT /privacyzone.');
    lines.push('  • root "/" matches ONLY the exact root path.');
    lines.push('');
    lines.push('Configure the Admin path so it matches the pathname above when the');
    lines.push('button SHOULD show, and does not match on the no-match page.');
    out(lines.join('\n'), '');
  }

  function openLayer() {
    if (!window.__ucCmp) { out('FAIL — __ucCmp not found.', 'fail'); return; }
    window.__ucCmp.showSecondLayer();
    log('showSecondLayer() called — consent layer should open.');
  }

  function clearSession() {
    if (!window.__ucCmp) { out('FAIL — __ucCmp not found.', 'fail'); return; }
    window.__ucCmp.clearUserSession()
      .then(function () { log('OK clearUserSession() — reloading…'); setTimeout(function () { location.reload(); }, 600); })
      .catch(function (e) { log('FAIL clearUserSession() — ' + e); });
  }

  /* --- Toolbar rendering -------------------------------------------------- */
  var BUTTONS = [
    ['CMP status', checkInit],
    ['Privacy Button rendered?', checkPrivacyButton],
    ['Privacy Trigger config', checkPrivacyTrigger],
    ['Banner auto-hidden?', checkBannerHidden],
    ['Page path / match rule', checkPagePath],
    ['showSecondLayer()', openLayer],
    ['clearUserSession + reload', clearSession],
    ['Clear log', function () { out(''); }],
  ];

  function renderToolbar(toolbarSel, resultSel) {
    resultEl = document.querySelector(resultSel);
    var bar = document.querySelector(toolbarSel);
    BUTTONS.forEach(function (b) {
      var el = document.createElement('button');
      el.textContent = b[0];
      el.addEventListener('click', b[1]);
      bar.appendChild(el);
    });
  }

  window.addEventListener('UC_UI_INITIALIZED', function () { log('UC_UI_INITIALIZED received'); });
  window.addEventListener('UC_UI_CMP_EVENT', function (e) { log('UC_UI_CMP_EVENT: ' + JSON.stringify(e.detail)); });

  window.ucRenderToolbar = renderToolbar;
  window.ucTestKit = {
    checkInit: checkInit,
    checkPrivacyButton: checkPrivacyButton,
    checkPrivacyTrigger: checkPrivacyTrigger,
    checkBannerHidden: checkBannerHidden,
    checkPagePath: checkPagePath,
  };
})();
