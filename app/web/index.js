const { urlencoded, json } = require('body-parser')
const express = require('express')
const path = require('path')

/**
 * Routes
 */
const SiteRouter = require('./app/routes/Site')

/**
 * Express instance
 */
const app = express()

/**
 * Middleware
 */
app.use(express.static(path.join(__dirname, '.', 'public')))
app.use(urlencoded({ extended: true }))
app.use(json())

/**
 * Routers
 */
app.use('/', SiteRouter)

/**
 * Express listen
 */
app.listen(8080)
