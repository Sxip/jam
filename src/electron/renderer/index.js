const Application = require('./application')
const { ipcRenderer } = require('electron')

const application = new Application()

const initializeApp = async () => {
  application.consoleMessage({
    message: 'Instantiating please wait.',
    type: 'wait'
  })

  try {
    await application.instantiate()

    application.consoleMessage({
      message: 'Successfully instantiated.',
      type: 'success'
    })

    application.attachNetworkingEvents()
  } catch (error) {
    application.consoleMessage({
      message: `Error during instantiation: ${error.message}`,
      type: 'error'
    })
  }
}

const setupIpcEvents = () => {
  ipcRenderer
    .on('message', (sender, args) => application.consoleMessage({ ...args }))
}

const setupAppEvents = () => {
  application
    .on('ready', () => application.activateAutoComplete())
    .on('refresh:plugins', () => {
      application.refreshAutoComplete()
      application.attachNetworkingEvents()
    })
}

console.log = (message) => {
  const formattedMessage = typeof message === 'object'
    ? JSON.stringify(message)
    : message

  application.consoleMessage({
    type: 'logger',
    message: formattedMessage
  })
}

initializeApp()
setupIpcEvents()
setupAppEvents()

window.jam = {
  application,
  dispatch: application.dispatch,
  settings: application.settings,
  server: application.server
}
