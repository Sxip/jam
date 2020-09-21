class Handler {
  constructor (manager) {
    /**
     * Manager that instantiated this handler
     */
    this.manager = manager
  }

  handle () {
    throw new Error('Method not implemented.')
  }
}

module.exports = Handler
