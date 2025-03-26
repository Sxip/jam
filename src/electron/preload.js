const path = require('path')

const __init__ = async () => {
  const isPluginPage = window.location.pathname.includes('plugins')

  const cssPath = `file://${path.resolve('assets', 'css', 'style.css')}`

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
