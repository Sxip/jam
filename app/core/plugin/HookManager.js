/**
 * Packet hook types
 */
const PACKET_HOOK_TYPES = [
  'local',
  'remote'
]

class HookManager {
  constructor() {
    /**
     * Local packet hooks
     */
    this.localPacketHooks = new Map()

    /**
     * Connection packet hooks
     */
    this.connectionPacketHooks = new Map()
  }

  /**
   * Hooks a packet
   */
  hookPacket(options = {}) {
    if (options.type === 'remote') return this._registerRemoteHook(options)
    else if (options.type === 'local') return this._registerLocalHook(options)
    else return null
  }

  /**
   * Registers all of the hooks
   */
  registerHooks(hooks) {
    if (!Array.isArray(hooks)) throw new Error('Hooks must be a typeof array')
    for (const hook of hooks) this._registerhook(hook)
  }

  /**
   * Deletes all of hooks within a plugin
   */
  deleteHooks(Plugin) {
    for (const hook of Plugin.hooks) {
      const { packet, type, execute } = hook

      if (type === 'remote') {
        const hook = this.connectionPacketHooks.get(packet)

        const index = hook.indexOf(execute)
        hook.splice(index, 1)
      } else {
        const hook = this.localPacketHooks.get(packet)

        const index = hook.indexOf(execute)
        hook.splice(index, 1)
      }
    }
  }

  /**
   * Registers a single hook
   * @param {Object} hook Hook object
   * @private
   */
  _registerhook(hook) {
    // eslint-disable-next-line max-len
    if (typeof hook.packet !== 'string' && typeof hook.packet !== 'number') throw new Error('Hook type must be a typeof string or number')
    if (typeof hook.type !== 'string') throw new Error('Hook type must be a typeof string')
    if (typeof hook.execute !== 'function') throw new Error('Hook execute callback must be a typeof function')

    if (!PACKET_HOOK_TYPES.includes(hook.type.toLowerCase())) {
      throw new Error('Invalid packet hook type. Type must be either local or remote')
    }

    if (hook.type === 'local') this._registerLocalHook(hook)
    else this._registerRemoteHook(hook)
  }

  /**
   * Registers a local packet hook
   */
  _registerLocalHook(hook) {
    if (this.localPacketHooks.has(hook.packet)) this.localPacketHooks.get(hook.packet).push(hook.execute)
    else this.localPacketHooks.set(hook.packet, [hook.execute])
  }

  /**
   * Registers a remote packet hook
   */
  _registerRemoteHook(hook) {
    if (this.connectionPacketHooks.has(hook.packet)) this.connectionPacketHooks.get(hook.packet).push(hook.execute)
    else this.connectionPacketHooks.set(hook.packet, [hook.execute])
  }
}

module.exports = HookManager
