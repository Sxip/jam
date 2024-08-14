const { Router } = require('express')

/**
 * Controllers.
 */
const FilesController = require('../controllers/FilesController')

/**
 * Express router.
 * @type {Router}
 * @const
 */
const router = Router()

/**
 * Animal Jam files route.
 * @public
 */
router.get(/^\/(\d{4})\/ajclient\.swf$/, (request, response) => FilesController.game(request, response))
router.get('*', (request, response) => FilesController.index(request, response))

module.exports = router
