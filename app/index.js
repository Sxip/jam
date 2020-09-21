const { ipcMain } = require('electron')
const Electron = require('./Electron')

const electron = Electron.bootstrap()
  .create()

/**
 * Ipc events
 */
ipcMain.on('open-directory', electron.openItem.bind(this))
ipcMain.on('window-close', () => electron.window.close())
ipcMain.on('window-minimize', () => electron.window.minimize())
