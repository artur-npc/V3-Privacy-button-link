/* ============================================================================
 * Shared CMP test kit
 *
 * Each page sets `window.UC_TEST_CASE` BEFORE loading this script:
 *
 *   window.UC_TEST_CASE = {
 *     name: 'Show on all pages',
 *     expectPrivacyButton: true,   // true = button must render, false = must NOT
 *   };
 *
 * The kit injects the Usercentrics loader itself. The loader URL, settingsId and
 * the data-sandbox flag are overridable at runtime via the loader panel — paste a
 * new loader URL, click "Apply & reload" and the page reloads with the new script.
 *
 *   ucRenderLoaderPanel('#loader-panel')   -> loader override UI
 *   ucRenderToolbar('#toolbar', '#result') -> automated checks toolbar
 * ========================================================================== */
(function () {
  var DEFAULT_LOADER = 'https://web.cmp.usercentrics-sandbox.eu/ui/loader.js';
  var DEFAULT_SETTINGS_ID = 'cqNAsnaCNNTg5s';

  // Predefined framework configurations — quick-switch presets.
  var PRESETS = [
    { label: 'CCPA', settingsId: 'cqNAsnaCNNTg5s' },
    { label: 'TCF', settingsId: 'GQIS-mIN1kW_ah' },
    { label: 'GDPR', settingsId: 'HTrWecvQcUoC94' },
  ];

  var LS_LOADER = 'uc-test:loaderUrl';
  var LS_SETTINGS = 'uc-test:settingsId';
  var LS_SANDBOX = 'uc-test:sandbox';

  var CASE = window.UC_TEST_CASE || { name: 'unnamed', expectPrivacyButton: true };
  var resultEl = null;

  /* --- persisted loader config ------------------------------------------- */
  function lsGet(key, dflt) {
    try { var v = localStorage.getItem(key); return v === null ? dflt : v; } catch (e) { return dflt; }
  }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function getLoaderUrl() { return lsGet(LS_LOADER, DEFAULT_LOADER); }
  function getSettingsId() { return lsGet(LS_SETTINGS, DEFAULT_SETTINGS_ID); }
  function getSandbox() { return lsGet(LS_SANDBOX, '1') === '1'; }

  /* --- loader injection --------------------------------------------------- */
  // Injects <script id="usercentrics-cmp" …> dynamically so the loader URL can
  // be swapped at runtime without editing the HTML.
  function injectLoader() {
    if (document.getElementById('usercentrics-cmp')) return;
    var s = document.createElement('script');
    s.id = 'usercentrics-cmp';
    s.src = getLoaderUrl();
    s.setAttribute('data-settings-id', getSettingsId());
    if (getSandbox()) s.setAttribute('data-sandbox', '1');
    (document.body || document.head).appendChild(s);
  }

  /* --- log helpers -------------------------------------------------------- */
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
    lines.push('Loader:         ' + getLoaderUrl());
    lines.push('settingsId:     ' + getSettingsId() + '   data-sandbox: ' + (getSandbox() ? '1' : '(off)'));
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
    lines.push('"Show on specific pages" matching rule:');
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

  /* --- Loader override panel --------------------------------------------- */
  function renderLoaderPanel(panelSel) {
    var host = document.querySelector(panelSel);
    if (!host) return;

    var activeSid = getSettingsId();
    var presetBtns = PRESETS.map(function (p) {
      var active = p.settingsId === activeSid ? ' active' : '';
      return '<button type="button" class="preset' + active + '" data-sid="' + p.settingsId + '">' +
        p.label + '</button>';
    }).join('');

    host.innerHTML =
      '<div class="loader-presets"><span>Framework:</span>' + presetBtns + '</div>' +
      '<label>Loader URL' +
      '<input type="text" id="uc-loader-url" placeholder="https://…/ui/loader.js"></label>' +
      '<label>settingsId' +
      '<input type="text" id="uc-settings-id" placeholder="settingsId"></label>' +
      '<label class="cb"><input type="checkbox" id="uc-sandbox"> add <code>data-sandbox="1"</code></label>' +
      '<div class="loader-actions">' +
      '<button id="uc-loader-apply">Apply &amp; reload</button>' +
      '<button id="uc-loader-reset">Reset to default</button>' +
      '</div>' +
      '<div class="loader-active" id="uc-loader-active"></div>';

    host.querySelector('#uc-loader-url').value = getLoaderUrl();
    host.querySelector('#uc-settings-id').value = getSettingsId();
    host.querySelector('#uc-sandbox').checked = getSandbox();
    host.querySelector('#uc-loader-active').textContent =
      'Active loader: ' + getLoaderUrl() +
      '  ·  settingsId=' + getSettingsId() +
      '  ·  data-sandbox=' + (getSandbox() ? '1' : '(off)');

    // Preset click — switch settingsId, keep loader URL / sandbox, reload.
    host.querySelectorAll('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        lsSet(LS_SETTINGS, b.getAttribute('data-sid'));
        location.reload();
      });
    });

    host.querySelector('#uc-loader-apply').addEventListener('click', function () {
      var url = host.querySelector('#uc-loader-url').value.trim();
      var sid = host.querySelector('#uc-settings-id').value.trim();
      var sb = host.querySelector('#uc-sandbox').checked;
      if (!url) { alert('Loader URL is empty.'); return; }
      if (!sid) { alert('settingsId is empty.'); return; }
      lsSet(LS_LOADER, url);
      lsSet(LS_SETTINGS, sid);
      lsSet(LS_SANDBOX, sb ? '1' : '0');
      location.reload();
    });
    host.querySelector('#uc-loader-reset').addEventListener('click', function () {
      lsDel(LS_LOADER);
      lsDel(LS_SETTINGS);
      lsDel(LS_SANDBOX);
      location.reload();
    });
  }

  /* --- Checks toolbar ----------------------------------------------------- */
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

  window.ucRenderLoaderPanel = renderLoaderPanel;
  window.ucRenderToolbar = renderToolbar;
  window.ucTestKit = {
    checkInit: checkInit,
    checkPrivacyButton: checkPrivacyButton,
    checkPrivacyTrigger: checkPrivacyTrigger,
    checkBannerHidden: checkBannerHidden,
    checkPagePath: checkPagePath,
  };

  // Inject the loader as soon as the kit runs.
  injectLoader();
})();
