const __init__ = () => {
  const plugins = window.location.pathname.match(/plugins/)

  if (plugins) {
    const link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('href', 'file:///../../../../assets/css/plugins/style.css')
    document.head.appendChild(link)
  } else {
    const link = document.createElement('link')
    link.setAttribute('rel', 'stylesheet')
    link.setAttribute('href', 'file:///../../../../assets/css/style.css')
    document.head.appendChild(link)

    window.jQuery = window.$ = require('jquery')
  }
}

window.__init__ = __init__

window.addEventListener('DOMContentLoaded', () => __init__())
