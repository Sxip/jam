const Application = require('../core/application')
const { remote } = require('electron')

/**
 * Instantiates the application
 */
const application = Application
  .bootstrap()

/**
 * Initializes the application
 */
application.initialize()
  .then(() => application.console.showMessage({
    message: 'Jam console',
    withStatus: true,
    type: 'speech'
  }))

/**
 * Application window
 */
window.core = {
  console: application.console,
  server: application.server,
  settings: application.settings,
  pluginManager: {
    instance: application.pluginManager,
    commands: application.pluginManager.commandManager,
    hooks: application.pluginManager.hookManager,
    dispatcher: application.pluginManager.dispatcher
  },
  application
}

window.addEventListener('beforeunload', () => {
  if (!remote.core.isPackaged) return
  remote.getCurrentWindow().destroy()
})
