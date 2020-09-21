const Plugin = require('..')

/**
 * Chat message types
 */
const MESSAGE_TYPES = [
  '0',
  '9'
]

class Copy extends Plugin {
  constructor(application) {
    super(application, {
      commands: [
        {
          name: 'copy',
          description: 'Copies player messages.',
          execute: () => this.copyCommand()
        }
      ],
      hooks: [
        {
          packet: 'uc',
          type: 'remote',
          execute: ({ packet }) => this.message(packet)
        }
      ]
    })

    /**
     * Copy toggle
     */
    this._copy = false
  }

  /**
   * Glow command
   */
  copyCommand() {
    this._copy = !this._copy
  }

  /**
   * Handles message packet
   * @public
   */
  message(packet) {
    const message = packet.value[5]
    const id = Number(packet.value[4])
    const type = packet.value[6]

    if (this._copy && id !== this.session.player.userId && MESSAGE_TYPES.includes(type)) {
      return this.session.remoteWrite(`<msg t="sys"><body action="pubMsg" r="724201"><txt><![CDATA[${message}%9]]></txt></body></msg>`)
    }
  }
}

module.exports = Copy
