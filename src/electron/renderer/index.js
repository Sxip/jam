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
application.on('ready', () => application.activateAutoComplete())

/**
* Application window.
*/
window.jam = {
  application,
  dispatch: application.dispatch,
  settings: application.settings,
  server: application.server
}
