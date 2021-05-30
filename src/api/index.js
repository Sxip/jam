const { urlencoded, json } = require('body-parser')
const express = require('express')
const path = require('path')

/**
 * Routes
 */
const ApiRouter = require('./routes')

/**
 * Express instance
 */
const app = express()

/**
 * Middleware
 */
app.use(express.static(path.resolve('public')))
app.use(urlencoded({ extended: true }))
app.use(json())

/**
 * Routers
 */
app.use('/', ApiRouter)

/**
 * Express listen
 */
app.listen(8080)
