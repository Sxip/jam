const HTTPClient = require('../../services/HttpClient')
const path = require('path')
const EventEmitter = require('events')

/**
 * HttpLogger event emitter
 * @type {EventEmitter}
 */
const httpLogger = new EventEmitter()
module.exports.httpLogger = httpLogger

/**
 * Files controller for handling HTTP requests and responses
 */
module.exports.controller = new class FilesController {
  constructor () {
    /**
     * Request cache for intercepted requests
     * @type {Map<String, Object>}
     */
    this.interceptedRequests = new Map()

    /**
     * Request counter for generating unique request IDs
     * @type {number}
     */
    this.requestCounter = 0

    /**
     * Map of URL patterns to local file paths for overrides
     * @type {Map<String, String>}
     */
    this.urlPatternOverrides = new Map()

    /**
     * Cache for storing responses to avoid duplicate requests
     * @type {Map<String, Object>}
     */
    this.cachedResponses = new Map()

    /**
     * Flag to enable or disable HTTP logging
     * @type {boolean}
     */
    this.loggingEnabled = true
  }

  /**
   * Enable or disable HTTP logging
   * @param {boolean} enabled - Whether HTTP logging should be enabled
   * @public
   */
  setLoggingEnabled (enabled) {
    this.loggingEnabled = enabled
    httpLogger.emit('logging-state-changed', { enabled })
    return true
  }

  /**
   * Check if HTTP logging is enabled
   * @returns {boolean} - Whether HTTP logging is enabled
   * @public
   */
  isLoggingEnabled () {
    return this.loggingEnabled
  }

  /**
   * Host endpoint.
   * @getter
   * @returns {Object}
   * @public
   */
  get baseUrl () {
    return 'https://ajcontent.akamaized.net'
  }

  /**
   * Request headers.
   * @getter
   * @returns {Object}
   * @public
   */
  get baseHeaders () {
    return {
      Host: 'ajcontent.akamaized.net',
      Referer: 'https://desktop.animaljam.com/gameClient/game/index.html'
    }
  }

  /**
   * Renders the animal jam swf file.
   * @param {Request} request
   * @param {Response} response
   * @retuns {void}
   * @public
   */
  game (request, response) {
    return process.platform === 'win32'
      ? response.sendFile(path.resolve('assets', 'flash', 'ajclient.swf'))
      : process.platform === 'darwin'
        ? response.sendFile(path.join(__dirname, '..', '..', '..', '..', '..', 'assets', 'flash', 'ajclient.swf'))
        : undefined
  }

  /**
   * Log HTTP request details
   * @param {Object} requestInfo - Information about the request
   * @returns {String} - Request ID
   * @private
   */
  _logRequest (requestInfo) {
    const requestId = `req_${Date.now()}_${this.requestCounter++}`

    this.interceptedRequests.set(requestId, {
      ...requestInfo,
      timestamp: Date.now(),
      modified: false
    })

    if (this.loggingEnabled) {
      httpLogger.emit('request', {
        id: requestId,
        path: requestInfo.path,
        method: requestInfo.method,
        headers: requestInfo.headers,
        timestamp: Date.now(),
        type: this._getFileType(requestInfo.path)
      })
    }

    return requestId
  }

  /**
   * Log HTTP response details
   * @param {String} requestId - Request ID to match with
   * @param {Object} responseInfo - Information about the response
   * @private
   */
  _logResponse (requestId, responseInfo) {
    if (this.interceptedRequests.has(requestId)) {
      const requestData = this.interceptedRequests.get(requestId)
      requestData.response = responseInfo
      requestData.responseTime = Date.now() - requestData.timestamp

      if (this.loggingEnabled) {
        httpLogger.emit('response', {
          id: requestId,
          status: responseInfo.statusCode,
          headers: responseInfo.headers,
          size: responseInfo.size,
          time: requestData.responseTime,
          modified: requestData.modified
        })
      }
    }
  }

  /**
   * Get file type from path
   * @param {String} path - Request path
   * @returns {String} - File type
   * @private
   */
  _getFileType (reqPath) {
    const ext = path.extname(reqPath).toLowerCase()
    const typeMap = {
      '.swf': 'Flash',
      '.png': 'Image',
      '.jpg': 'Image',
      '.jpeg': 'Image',
      '.gif': 'Image',
      '.css': 'Style',
      '.js': 'Script',
      '.json': 'Data',
      '.xml': 'Data'
    }

    return typeMap[ext] || 'Other'
  }

  /**
   * Register a URL pattern to be overridden with a local file
   * @param {String} pathPattern - URL path pattern to match
   * @param {String} localFilePath - Path to local file to use as override
   * @public
   */
  registerPathOverride (pathPattern, localFilePath) {
    this.urlPatternOverrides.set(pathPattern, localFilePath)

    httpLogger.emit('pattern-override', {
      pathPattern,
      localFilePath,
      timestamp: Date.now()
    })

    return true
  }

  /**
   * Check if a path matches any registered override patterns
   * @param {String} path - Request path to check
   * @returns {String|null} - Path to override file or null if no match
   * @private
   */
  _getPathOverride (reqPath) {
    for (const [pattern, filePath] of this.urlPatternOverrides.entries()) {
      if (reqPath.includes(pattern)) {
        return filePath
      }
    }
    return null
  }

  /**
   * Override a response with a local file
   * @param {String} requestId - Request ID to override
   * @param {String} localFilePath - Path to local file
   * @public
   */
  overrideResponse (requestId, localFilePath) {
    if (this.interceptedRequests.has(requestId)) {
      const requestData = this.interceptedRequests.get(requestId)
      requestData.override = localFilePath
      requestData.modified = true

      this.registerPathOverride(requestData.path, localFilePath)

      httpLogger.emit('modified', {
        id: requestId,
        path: requestData.path,
        override: localFilePath
      })

      return true
    }
    return false
  }

  /**
   * Renders the animal jam files.
   * @param {Request} request
   * @param {Response} response
   * @returns {void}
   * @public
   */
  index (request, response) {
    const requestId = this._logRequest({
      path: request.path,
      method: request.method,
      headers: request.headers,
      query: request.query
    })

    const pathOverride = this._getPathOverride(request.path)
    if (pathOverride) {
      const requestData = this.interceptedRequests.get(requestId)
      if (requestData) {
        requestData.override = pathOverride
        requestData.modified = true
      }
    }

    const requestData = this.interceptedRequests.get(requestId)
    if (requestData && requestData.override) {
      const filePath = path.resolve(requestData.override)
      return response.sendFile(filePath, err => {
        if (err) {
          this._processOriginalRequest(request, response, requestId)
        } else {
          this._logResponse(requestId, {
            statusCode: 200,
            headers: { 'content-type': 'application/octet-stream' },
            size: 'Unknown',
            overridden: true
          })
        }
      })
    }

    return this._processOriginalRequest(request, response, requestId)
  }

  /**
   * Process the original request without overrides
   * @param {Request} request - The original request object
   * @param {Response} response - The response object to send the data to
   * @param {String} requestId - The ID of the request being processed
   * @returns {Stream} - The response stream from the proxy
   */
  _processOriginalRequest (request, response, requestId) {
    const targetUrl = `${this.baseUrl}/${request.path}`

    const proxy = HTTPClient.proxy({
      url: targetUrl,
      headers: this.baseHeaders
    })

    let responseSize = 0
    let responseStatusCode = null
    let responseHeaders = null

    proxy.on('response', proxyRes => {
      responseStatusCode = proxyRes.statusCode
      responseHeaders = proxyRes.headers

      proxyRes.on('data', chunk => {
        responseSize += chunk.length
      })

      proxyRes.on('end', () => {
        this._logResponse(requestId, {
          statusCode: responseStatusCode,
          headers: responseHeaders,
          size: responseSize
        })
      })
    })

    proxy.on('error', err => {
      this._logResponse(requestId, {
        statusCode: 500,
        error: err.message
      })
    })

    return request.pipe(proxy).pipe(response)
  }
}()
