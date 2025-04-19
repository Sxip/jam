const { Router } = require('express')

/**
 * Controllers.
 */
const { controller: FilesController, httpLogger } = require('../controllers/FilesController')

/**
 * Express router.
 * @type {Router}
 * @const
 */
const router = Router()

/**
 * Animal Jam game file route.
 * @public
 */
router.get(/^\/(\d{4})\/ajclient\.swf$/, (request, response) => FilesController.game(request, response))

/**
 * Animal Jam Classic files route.
 * @public
 */
router.get('*', (request, response) => FilesController.index(request, response))

module.exports = { router, httpLogger }
