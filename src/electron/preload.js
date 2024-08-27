const __init__ = () => {
  const isPluginPage = window.location.pathname.includes('plugins')

  const link = document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('href', isPluginPage
    ? 'file:///../../../../assets/css/plugins/style.css'
    : 'file:///../../../../assets/css/style.css')

  document.head.appendChild(link)

  if (isPluginPage) {
    window.jQuery = window.$ = require('jquery')
  }
}

window.__init__ = __init__

document.addEventListener('DOMContentLoaded', window.__init__)
