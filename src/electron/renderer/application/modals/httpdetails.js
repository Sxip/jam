/**
 * Module name
 * @type {string}
 */
exports.name = 'httpdetails'

/**
 * Render the HTTP details modal
 * @param {Application} app - The application instance
 * @param {Object} data - The HTTP request/response data to display
 * @returns {JQuery<HTMLElement>} The rendered modal element
 */
exports.render = function (app, data = {}) {
  const path = require('path')
  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return 'Unknown'
    if (bytes === 0) return '0 B'

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
  }

  const formatTime = (ms) => {
    if (ms === undefined || ms === null) return '-'
    if (ms < 1000) return `${ms.toFixed(0)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  const getStatusClass = (status) => {
    if (!status) return 'text-gray-400'
    if (status < 200) return 'text-gray-400'
    if (status < 300) return 'text-highlight-green'
    if (status < 400) return 'text-custom-blue'
    if (status < 500) return 'text-custom-pink'
    return 'text-error-red'
  }

  const request = data.request || {}
  const response = data.response || {}
  const requestHeaders = request.headers || {}
  const responseHeaders = response.headers || {}
  const status = response.status || '-'
  const statusClass = getStatusClass(status)
  const modified = data.modified || false
  const type = data.type || 'Unknown'
  const fileName = path.basename(data.path || '')

  let queryParams = ''
  if (data.path && data.path.includes('?')) {
    const params = new URLSearchParams(data.path.split('?')[1])
    const paramRows = []
    params.forEach((value, key) => {
      paramRows.push(`
        <tr class="hover:bg-tertiary-bg/30">
          <td class="px-3 py-1 border-b border-sidebar-border/10">${key}</td>
          <td class="px-3 py-1 border-b border-sidebar-border/10 text-highlight-green">${value}</td>
        </tr>
      `)
    })
    if (paramRows.length > 0) {
      queryParams = `
        <div class="mt-4">
          <h4 class="text-sm font-medium text-custom-pink mb-2">Query Parameters</h4>
          <div class="bg-tertiary-bg/20 rounded border border-sidebar-border/30 overflow-hidden">
            <table class="w-full text-sm text-left text-text-primary">
              <thead class="text-xs uppercase bg-tertiary-bg/50 text-gray-400">
                <tr>
                  <th class="px-3 py-2">Parameter</th>
                  <th class="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                ${paramRows.join('')}
              </tbody>
            </table>
          </div>
        </div>
      `
    }
  }

  const requestHeaderRows = []
  Object.entries(requestHeaders).forEach(([key, value]) => {
    requestHeaderRows.push(`
      <tr class="hover:bg-tertiary-bg/30">
        <td class="px-3 py-1 border-b border-sidebar-border/10">${key}</td>
        <td class="px-3 py-1 border-b border-sidebar-border/10 text-custom-blue">${value}</td>
      </tr>
    `)
  })

  const responseHeaderRows = []
  Object.entries(responseHeaders).forEach(([key, value]) => {
    responseHeaderRows.push(`
      <tr class="hover:bg-tertiary-bg/30">
        <td class="px-3 py-1 border-b border-sidebar-border/10">${key}</td>
        <td class="px-3 py-1 border-b border-sidebar-border/10 text-custom-blue">${value}</td>
      </tr>
    `)
  })

  const $modal = $(`
    <div class="flex items-center justify-center min-h-screen p-4">
      <!-- Modal Content -->
      <div class="relative bg-secondary-bg rounded-lg shadow-xl max-w-3xl w-full">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-sidebar-border">
          <div>
            <h3 class="text-lg font-medium text-text-primary flex items-center">
              <i class="fas fa-globe text-custom-pink mr-2"></i>
              <span class="truncate max-w-md">${fileName || 'HTTP Request'}</span>
              ${modified
      ? '<span class="ml-2 px-1.5 py-0.5 text-xs rounded bg-custom-pink/20 text-custom-pink">Modified</span>'
      : ''}
            </h3>
            <p class="text-gray-400 text-xs flex items-center mt-1">
              <span class="truncate max-w-lg">${data.path || 'Unknown path'}</span>
            </p>
          </div>
          <button type="button" class="text-sidebar-text hover:text-text-primary" id="closeHttpDetailsBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Tabs -->
        <div class="border-b border-sidebar-border">
          <nav class="flex px-4" aria-label="Tabs">
            <button id="requestTabBtn" class="px-4 py-3 text-sm font-medium border-b-2 border-custom-pink text-custom-pink">
              Request
            </button>
            <button id="responseTabBtn" class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-sidebar-text hover:text-text-primary">
              Response
            </button>
          </nav>
        </div>
        
        <!-- Tab Content -->
        <div class="p-5 max-h-96 overflow-y-auto">
          <!-- Request Tab Content -->
          <div id="requestTab" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="text-sm font-medium text-custom-pink mb-2">Request Details</h4>
                <div class="bg-tertiary-bg/20 rounded border border-sidebar-border/30 p-3">
                  <div class="grid grid-cols-3 gap-2 text-sm">
                    <div class="text-gray-400">Method:</div>
                    <div class="col-span-2 text-text-primary">${request.method || 'GET'}</div>
                    
                    <div class="text-gray-400">Type:</div>
                    <div class="col-span-2 text-text-primary">${type}</div>
                    
                    <div class="text-gray-400">Timestamp:</div>
                    <div class="col-span-2 text-text-primary">${new Date(request.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            </div>
            
            ${queryParams}
            
            <div class="mt-4">
              <h4 class="text-sm font-medium text-custom-pink mb-2">Request Headers</h4>
              <div class="bg-tertiary-bg/20 rounded border border-sidebar-border/30 overflow-hidden">
                ${requestHeaderRows.length > 0
      ? `
                  <table class="w-full text-sm text-left text-text-primary">
                    <thead class="text-xs uppercase bg-tertiary-bg/50 text-gray-400">
                      <tr>
                        <th class="px-3 py-2">Header</th>
                        <th class="px-3 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${requestHeaderRows.join('')}
                    </tbody>
                  </table>
                `
      : '<p class="text-gray-400 text-sm p-3">No request headers available</p>'}
              </div>
            </div>
          </div>
          
          <!-- Response Tab Content -->
          <div id="responseTab" class="space-y-4 hidden">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <h4 class="text-sm font-medium text-custom-pink mb-2">Response Details</h4>
                <div class="bg-tertiary-bg/20 rounded border border-sidebar-border/30 p-3">
                  <div class="grid grid-cols-3 gap-2 text-sm">
                    <div class="text-gray-400">Status:</div>
                    <div class="col-span-2 ${statusClass}">${status}</div>
                    
                    <div class="text-gray-400">Size:</div>
                    <div class="col-span-2 text-text-primary">${formatSize(response.size)}</div>
                    
                    <div class="text-gray-400">Time:</div>
                    <div class="col-span-2 text-text-primary">${formatTime(data.time)}</div>
                    
                    ${modified
      ? `
                    <div class="text-gray-400">Modified:</div>
                    <div class="col-span-2 text-custom-pink">Yes - Custom response served</div>
                    `
      : ''}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-4">
              <h4 class="text-sm font-medium text-custom-pink mb-2">Response Headers</h4>
              <div class="bg-tertiary-bg/20 rounded border border-sidebar-border/30 overflow-hidden">
                ${responseHeaderRows.length > 0
      ? `
                  <table class="w-full text-sm text-left text-text-primary">
                    <thead class="text-xs uppercase bg-tertiary-bg/50 text-gray-400">
                      <tr>
                        <th class="px-3 py-2">Header</th>
                        <th class="px-3 py-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${responseHeaderRows.join('')}
                    </tbody>
                  </table>
                `
      : '<p class="text-gray-400 text-sm p-3">No response headers available or request pending</p>'}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="flex items-center justify-between p-4 border-t border-sidebar-border">
          <div class="flex items-center text-xs text-gray-400">
            <i class="fas fa-info-circle mr-1"></i>
            <span>Request ID: ${data.id || 'Unknown'}</span>
          </div>
          
          <div class="flex space-x-2">
            <button id="modifyResponseBtn" class="text-xs bg-custom-pink text-white px-3 py-1.5 rounded hover:bg-custom-pink/90 transition">
              <i class="fas fa-edit mr-1"></i> Override Future Responses
            </button>
            <button id="closeDetailsBtn" class="text-xs bg-tertiary-bg text-text-primary px-3 py-1.5 rounded hover:bg-sidebar-hover transition">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `)

  $modal.find('#closeHttpDetailsBtn, #closeDetailsBtn').on('click', () => {
    app.modals.close()
  })

  $modal.find('#requestTabBtn').on('click', function () {
    $modal.find('#requestTab').removeClass('hidden')
    $modal.find('#responseTab').addClass('hidden')
    $modal.find('#requestTabBtn').removeClass('border-transparent text-sidebar-text').addClass('border-custom-pink text-custom-pink')
    $modal.find('#responseTabBtn').removeClass('border-custom-pink text-custom-pink').addClass('border-transparent text-sidebar-text')
  })

  $modal.find('#responseTabBtn').on('click', function () {
    $modal.find('#responseTab').removeClass('hidden')
    $modal.find('#requestTab').addClass('hidden')
    $modal.find('#responseTabBtn').removeClass('border-transparent text-sidebar-text').addClass('border-custom-pink text-custom-pink')
    $modal.find('#requestTabBtn').removeClass('border-custom-pink text-custom-pink').addClass('border-transparent text-sidebar-text')
  })

  $modal.find('#modifyResponseBtn').on('click', function () {
    app.modals.close()
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-http-override-dialog', {
        detail: { requestId: data.id }
      }))
    }, 300)
  })

  return $modal
}

/**
 * Close handler for the HTTP details modal
 * @param {Application} app - The application instance
 */
exports.close = function (app) {
  // No cleanup needed for this modal i believe
}
