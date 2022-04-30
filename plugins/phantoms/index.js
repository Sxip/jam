module.exports = function ({ dispatch }) {
    let phantoms = false
    let interval = null
    
    /**
     * Sends a remote message with a timeout.
     */
    const write = async (message) => {
      await dispatch.sendRemoteMessage(message)
      await dispatch.wait(1000)
    }
  
    /**
     * Adventure loop.
     */
    const adventure = () => {
      if (phantoms) {
        interval = setInterval(async () => {
          await write("%xt%o%qj%8266935%stagingQuestadventures.queststaging_421_0_585_11672#30%14%1%0%");
          await write("%xt%o%qs%8299238%dentestofpower%");
          await write("%xt%o%qpup%0%bunny_key_3a%2209994%");
          await write("%xt%o%qat%0%bunny_7%0%");
          await write("%xt%o%qpup%0%bunny_key_3a%2209994%");
          await write("%xt%o%qat%0%bunny_8%0%");
          await write("%xt%o%qpup%0%bunny_key_3a%2209994%");
          await write("%xt%o%qat%0%bunny_9%0%")
          await write("%xt%o%qpup%0%bunny_key_3a%2209994%");
          await write("%xt%o%qat%0%bunny_10%0%");
          await write("%xt%o%qaskr%8306652%liza_2%1%1%");
          await write("%xt%o%qpgift%3793086%0%0%0%");
          await write("%xt%o%qpgift%3793086%1%0%0%");
          await write("%xt%o%qpgift%3793086%2%0%0%");
          await write("%xt%o%qpgift%3793086%3%0%0%");
          await write("%xt%o%qpgift%3793086%4%0%0%");
          await write("%xt%o%qx%4120201%%");
        }, 3000)
      }
      }
  
    /**
     * Hooks a command.
     */
    dispatch.onCommand({
      name: 'phantoms',
      description: 'Completes return of the phantoms adventures.',
      callback: () => {
        phantoms = !phantoms
  
        if (interval !== null) {
          clearInterval(interval)
          interval = null
          return
        }
        
        adventure()
      }
    })
  }
  