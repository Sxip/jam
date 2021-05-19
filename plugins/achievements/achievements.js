const Plugin = require('..')

class Achievements extends Plugin {
  constructor(application) {
    super(application, {
      commands: [
        {
          name: 'achievements',
          description: 'Gives your character (most) in-game achievements.',
          execute: ()  => this.start()
        }
      ]
    })
      //Achievements array, you can add or remove any Achievements you want or don't want
  this.aarray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 36, 86, 38, 39, 40, 41, 44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 64, 65, 66, 67, 76, 77, 78, 85, 84, 80, 17, 79, 82, 83, 81, 86, 87, 91, 92, 93, 94, 95, 97, 96, 31, 32, 37, 113, 115, 130, 131, 132, 143, 144, 145, 159, 160, 212, 213, 212, 277, 278, 279, 280, 281, 282, 283, 284, 285, 292, 293, 294, 310, 309, 308, 313, 314, 315, 316, 317, 318, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 344, 345, 346, 347, 349, 350, 351, 352, 353, 357, 358, 359, 360, 361, 378, 377, 386, 387, 388, 403, 405, 445, 444, 446] 
  }
 
  /**
   * Sends the achievements from array
   */
  async give() {
    for (let i = 0; i < this.aarray.length; i++)
    {
      if(this.session.connection.writable){
        this.session.remoteWrite(`%xt%o%zs%-1%${this.aarray[i]}%9999999%1%`)
        await this.sleep(110)
      }     
    }
  }
   /**
   * That one thingything that does stuff
   */
   async start() {
    try{
    this.consoleMessage({
      message: `Giving ${this.session.player.userName} ${this.aarray.length} achievements. Please wait!`,
      withStatus: true,
      type: 'wait'
    })
    await this.give()
    this.consoleMessage({
      message: `Successfully gave ${this.session.player.userName} ${this.aarray.length} achievements!`,
      withStatus: true,
      type: 'success'
    })
  }
  catch{
    this.consoleMessage({
      message: `Failed to give ${this.session.player.userName} ${this.aarray.length} achievements!`,
      withStatus: true,
      type: 'error'
    })
  }
  }
  
  //Thanks StackOverFlow
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = Achievements
