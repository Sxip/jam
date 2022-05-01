const Application = require('./application')
const { ipcRenderer } = require('electron')

/**
 * Instantiates the application
 */
const application = new Application()

/**
* Console message.
*/
application.consoleMessage({
  message: 'Instantiating please wait.',
  type: 'wait'
})

/**
* Initializes the application.
*/
application.instantiate()
  .then(() => application.consoleMessage({
    message: 'Jam has successfully instantiated.',
    type: 'success'
  }))

/**
  * IPC events.
  */
ipcRenderer
  .on('message', (sender, { ...args }) => application.consoleMessage({
    ...args
  }))
  .on('close', () => application.patcher.unpatchApplication())

/**
 * Application events.
 */
application
  .on('ready', () => application.activateAutoComplete())
  .on('refresh:plugins', () => application.refreshAutoComplete())

/**
 * Logger
 */
console.log = message => {
  if (typeof message === 'object') {
    message = JSON.stringify(message)
  }

  application.consoleMessage({
    type: 'logger',
    message: `<highlight>Debugger</highlight>: ${message}`
  })
}

/**
* Application window.
*/
window.jam = {
  application,
  dispatch: application.dispatch,
  settings: application.settings,
  server: application.server
}
