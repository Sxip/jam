const fs = require('fs').promises
const path = require('path')

class ModalSystem {
  /**
   * Constructor.
   * @param {Application} application - The application instance
   */
  constructor (application) {
    this.application = application
    this.registeredModals = new Map()
    this.activeModal = null
  }

  /**
   * Initialize the modal system
   */
  async initialize () {
    try {
      const modals = await this._loadAllModals()

      modals.forEach(modal => {
        this.register(modal.name, modal)
      })
    } catch (error) {
      this.application.consoleMessage({
        message: `Error initializing modals: ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Load all modal modules from the modals directory
   * @returns {Promise<Array>} An array of modal modules
   * @private
   */
  async _loadAllModals () {
    try {
      const files = await fs.readdir(__dirname)

      const modalFiles = files.filter(file => {
        return file.endsWith('.js') && file !== 'index.js'
      })

      const modals = []
      for (const file of modalFiles) {
        try {
          const modalModule = require(path.join(__dirname, file))

          if (modalModule && modalModule.name && typeof modalModule.render === 'function') {
            modals.push(modalModule)
          }
        } catch (err) {
          this.application.consoleMessage({
            message: `Error loading modal module "${file}": ${err.message}`,
            type: 'error'
          })
        }
      }
      return modals
    } catch (error) {
      this.application.consoleMessage({
        message: `Error loading modal modules: ${error.message}`,
        type: 'error'
      })
      return []
    }
  }

  /**
   * Register a modal
   * @param {string} name - The name of the modal
   * @param {Object} modalModule - The modal module with render method
   */
  register (name, modalModule) {
    if (!modalModule || typeof modalModule.render !== 'function') {
      console.error(`Invalid modal module for "${name}": Missing render method`)
      return
    }

    this.registeredModals.set(name, modalModule)
  }

  /**
   * Show a modal
   * @param {string} name - The name of the modal to show
   * @param {string} target - The selector for the container element
   * @param {Object} data - Optional data to pass to the modal
   * @returns {JQuery<HTMLElement>|null} - The rendered modal or null if not found
   */
  show (name, target = '#modalContainer', data = {}) {
    const modalModule = this.registeredModals.get(name)
    if (!modalModule) {
      this.application.consoleMessage({
        message: `Modal "${name}" not found`,
        type: 'error'
      })
      return null
    }

    const $container = $(target)
    if (!$container.length) {
      this.application.consoleMessage({
        message: `Modal container "${target}" not found`,
        type: 'error'
      })
      return null
    }

    $container.empty()

    try {
      const $modal = modalModule.render(this.application, data)

      if (!$modal) {
        this.application.consoleMessage({
          message: `Modal "${name}" returned null from render`,
          type: 'error'
        })
        return null
      }

      $container.append($modal)
      $container.removeClass('hidden')

      this.activeModal = {
        name,
        $element: $modal,
        $container: $container
      }

      return $modal
    } catch (error) {
      this.application.consoleMessage({
        message: `Error showing modal "${name}": ${error.message}`,
        type: 'error'
      })
      return null
    }
  }

  /**
   * Close the currently active modal
   */
  close () {
    if (this.activeModal) {
      const { $container, name } = this.activeModal

      const modalModule = this.registeredModals.get(name)
      if (modalModule && typeof modalModule.close === 'function') {
        modalModule.close(this.application)
      }

      $container.addClass('hidden')

      setTimeout(() => {
        $container.empty()
      }, 300)

      this.activeModal = null
    }
  }
}

module.exports = ModalSystem
