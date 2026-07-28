/**
 * Banno Pulse — iframe / mobile embed helpers.
 * Loaded only when rendered inside the Banno plugin webview.
 */
;(function () {
  var root = document.documentElement

  function inIframe() {
    try {
      return window.self !== window.top
    } catch {
      return true
    }
  }

  if (inIframe()) {
    root.classList.add('embed-mode')
  }

  // Compact tap targets: prevent double-tap zoom on buttons inside the webview
  var meta = document.querySelector('meta[name="viewport"]')
  if (meta && inIframe()) {
    var content = meta.getAttribute('content') || ''
    if (!content.includes('viewport-fit')) {
      meta.setAttribute('content', content + ', viewport-fit=cover')
    }
  }
})()
