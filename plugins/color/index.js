const Plugin = require('..')

class Color extends Plugin {
  constructor (application) {
    super(application, {
      commands: [
        {
          name: 'color',
          description: 'Changes your avatar color.',
          execute: () => this.colorCommand()
        }
      ]
    })

    /**
     * Color interval
     */
    this._interval = null
  }

  /**
   * Sends the color packet
   */
  async color () {
    const randomOne = this.random(1019311667, 4348810240)
    const randomTwo = this.random(1019311667, 4348810240)

    this.session.remoteWrite(`%xt%o%ap%4203%${randomOne}%${randomTwo}%${randomOne}%0%`)
  }

  /**
   * Glow command
   */
  colorCommand () {
    if (this._interval) return this.clear()

    this._interval = this.session.setInterval(() => this.color(), 600)
    this.session.serverMessage('Only other players will be able to see your colors.')
  }

  /**
   * Clears an interval
   */
  clear () {
    this.session.clearInterval(this._interval)
    this._interval = null
  }
}

module.exports = Color
