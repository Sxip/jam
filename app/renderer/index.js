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
      message: `You are using Jam v${remote.app.getVersion()}.`,
      withStatus: true,
      type: 'speech'
    }))

  .then(() => application.console.showMessage({
    message: `If you are enjoying using Jam, head over to our <a href="https://discord.link/jam" target="external">Discord</a> server.`,
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
