class Dispatcher {
  constructor (manager) {
    this.manager = manager
  }

  async dispatchLocalHooks (client, packet, type = '*') {
    const promises = []

    const hooks = this.manager.hookManager.localPacketHooks.get(type) || []
    for (const execute of hooks) promises.push(execute({ client, packet, type }))

    await Promise.all(promises)
  }

  async dispatchConnectionHooks (client, packet, type = '*') {
    const promises = []

    const hooks = this.manager.hookManager.connectionPacketHooks.get(type) || []
    for (const execute of hooks) promises.push(execute({ client, packet, type }))

    await Promise.all(promises)
  }
}

module.exports = Dispatcher
