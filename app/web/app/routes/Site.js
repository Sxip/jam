const { Router } = require('express')

/**
 * Controllers
 */
const FilesController = require('../controllers/FilesController')

/**
 * Router
 */
const router = Router()

/**
 * Game routes
 */
router.get('*', (request, response) => FilesController.index(request, response))

module.exports = router
