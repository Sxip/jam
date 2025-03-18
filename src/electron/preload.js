const path = require('path')

const __init__ = () => {
  const isPluginPage = window.location.pathname.includes('plugins')

  const basePath = path.join(__dirname, '..', '..', 'assets', 'css')
  const cssPath = isPluginPage
    ? `file://${path.join(basePath, 'plugins', 'style.css')}`
    : `file://${path.join(basePath, 'style.css')}`

  const link = document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('href', cssPath)

  document.head.appendChild(link)

  if (isPluginPage) {
    window.jQuery = window.$ = require('jquery')
  }
}

window.__init__ = __init__

document.addEventListener('DOMContentLoaded', window.__init__)