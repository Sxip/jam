const Plugin = require('..')

class Glow extends Plugin {
  constructor (application) {
    super(application, {
      commands: [
        {
          name: 'glow',
          description: 'Changes your avatar color glow.',
          execute: () => this.glowCommand()
        }
      ]
    })

    /**
     * Color interval
     */
    this._interval = null
  }

  /**
   * Sends the glow packet
   */
  glow () {
    const color = this.random(1019311667, 4348810240)
    this.session.remoteWrite(`<msg t="sys"><body action="pubMsg" r="2002"><txt><![CDATA[${color}%8]]></txt></body></msg>`)
  }

  /**
   * Glow command
   */
  glowCommand () {
    if (this._interval) return this.clear()

    this._interval = this.session.setInterval(() => this.glow(), 600)
    this.session.serverMessage('Only other players will be able to see your glow.')
  }

  /**
   * Clears an interval
   */
  clear () {
    this.session.clearInterval(this._interval)
    this._interval = null
  }
}

module.exports = Glow
