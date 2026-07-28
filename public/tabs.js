/**
 * Banno Pulse — client-side tab switching + iframe helpers.
 * Tabs switch instantly without a full page reload (critical inside Banno webviews).
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

  function activateTab(tabId) {
    var panels = document.querySelectorAll('.tab-panel')
    var links = document.querySelectorAll('.tab-link[data-tab]')
    var i

    for (i = 0; i < panels.length; i++) {
      var panel = panels[i]
      var isActive = panel.getAttribute('data-tab') === tabId
      panel.classList.toggle('active', isActive)
      panel.hidden = !isActive
    }

    for (i = 0; i < links.length; i++) {
      var link = links[i]
      var active = link.getAttribute('data-tab') === tabId
      link.classList.toggle('active', active)
      if (active) {
        link.setAttribute('aria-current', 'page')
      } else {
        link.removeAttribute('aria-current')
      }
    }

    var main = document.querySelector('.app-main')
    if (main) main.scrollTop = 0

    var url = '/callback/plugin?tab=' + encodeURIComponent(tabId)
    if (window.location.pathname.endsWith('/callback/plugin')) {
      history.replaceState({ tab: tabId }, '', url)
    }
  }

  function initTabs() {
    var nav = document.querySelector('.tab-nav')
    if (!nav) return

    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-tab]')
      if (!link || !nav.contains(link)) return
      event.preventDefault()
      activateTab(link.getAttribute('data-tab'))
    })

    // Sync panels from server-rendered active state
    var activeLink = nav.querySelector('.tab-link.active[data-tab]')
    if (activeLink) {
      activateTab(activeLink.getAttribute('data-tab'))
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs)
  } else {
    initTabs()
  }
})()
