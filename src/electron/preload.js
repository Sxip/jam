const __init__ = () => {
  const isPluginPage = window.location.pathname.includes('plugins')

  // Create and configure the link element
  const link = document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('href', isPluginPage
    ? 'file:///../../../../assets/css/plugins/style.css'
    : 'file:///../../../../assets/css/style.css')

  document.head.appendChild(link)

  // Only load jQuery if not on the plugins page
  if (!isPluginPage) {
    window.jQuery = window.$ = require('jquery')
  }
}

// Bind the __init__ function to window and set up the event listener
window.__init__ = __init__

document.addEventListener('DOMContentLoaded', window.__init__)
