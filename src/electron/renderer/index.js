const Application = require('./application')

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
 * Application window
 */
window.jam = {
  application,
  settings: application.settings,
  server: application.server
}
