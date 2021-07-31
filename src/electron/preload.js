const __init__ = () => {
  const link = document.createElement('link')
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('href', 'file:///../../../../assets/css/style.css')

  document.head.appendChild(link)

  window.jQuery = window.$ = require('jquery')
}

window.__init__ = __init__

window.addEventListener('DOMContentLoaded', () => __init__())
