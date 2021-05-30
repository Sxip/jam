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
router.get('*', (request, response) => FilesController.index(request, response))

module.exports = router
