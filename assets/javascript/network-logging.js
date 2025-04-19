(function setupHttpLogging () {
  const { ipcRenderer, clipboard } = require('electron')
  const path = require('path')

  const httpRequests = new Map()
  let httpRequestCount = 0
  let httpIncomingCount = 0
  let httpOutgoingCount = 0
  let selectedRequestId = null

  const $httpLogBody = $('#http-log-body')
  const $httpIncomingCount = $('#httpIncomingCount')
  const $httpOutgoingCount = $('#httpOutgoingCount')
  const $httpTotalCount = $('#httpTotalCount')
  const $httpTypeFilter = $('#httpTypeFilter')
  const $httpSearch = $('#httpSearch')

  const $httpContextMenu = $('#httpContextMenu')
  const $fileSelectionDialog = $('#fileSelectionDialog')

  const $httpDetailsPanel = $('#http-details-panel')
  const $httpDetailsTabRequest = $('#httpDetailsTabRequest')
  const $httpDetailsTabResponse = $('#httpDetailsTabResponse')

  /**
   * Format a file size in bytes to a human-readable string
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  const formatSize = (bytes) => {
    if (bytes === undefined || bytes === null) return 'Unknown'
    if (bytes === 0) return '0 B'

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))

    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
  }

  /**
   * Format time in milliseconds to a human-readable string
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  const formatTime = (ms) => {
    if (ms === undefined || ms === null) return ''
    if (ms < 1000) return `${ms.toFixed(0)} ms`
    return `${(ms / 1000).toFixed(2)} s`
  }

  /**
   * Get status class based on HTTP status code
   * @param {number} status - HTTP status code
   * @returns {string} CSS class for the status
   */
  const getStatusClass = (status) => {
    if (!status) return 'text-gray-400'
    if (status < 200) return 'text-gray-400'
    if (status < 300) return 'text-highlight-green'
    if (status < 400) return 'text-custom-blue'
    if (status < 500) return 'text-custom-pink'
    return 'text-error-red'
  }

  /**
   * Create a new row for an HTTP request
   * @param {Object} data - Request data
   */
  const createRequestRow = (data) => {
    httpRequestCount++
    httpIncomingCount++

    $httpIncomingCount.text(httpIncomingCount)
    $httpTotalCount.text(httpRequestCount)

    const rowId = `http-row-${data.id}`
    const truncatedPath = data.path.length > 50 ? data.path.substring(0, 47) + '...' : data.path

    const $row = $(`
      <tr id="${rowId}" class="http-row request-row hover:bg-tertiary-bg/50 cursor-pointer border-b border-sidebar-border/10" data-id="${data.id}" data-type="${data.type || 'Other'}">
        <td class="px-2 py-1.5 text-xs text-gray-400">${httpRequestCount}</td>
        <td class="px-2 py-1.5 text-center">
          <i class="fas fa-arrow-down text-custom-pink"></i>
        </td>
        <td class="px-2 py-1.5 text-xs text-text-primary truncate max-w-[300px]" title="${data.path}">${truncatedPath}</td>
        <td class="px-2 py-1.5 text-xs text-gray-400">Pending</td>
        <td class="px-2 py-1.5 text-xs text-gray-400">${data.type || 'Other'}</td>
        <td class="px-2 py-1.5 text-xs text-gray-400 text-right">-</td>
        <td class="px-2 py-1.5 text-xs text-gray-400 text-right">-</td>
      </tr>
    `)

    $httpLogBody.prepend($row)

    httpRequests.set(data.id, {
      request: data,
      id: data.id,
      path: data.path,
      method: data.method || 'GET',
      timestamp: data.timestamp,
      type: data.type || 'Other',
      rowElement: $row
    })

    applyHttpFilters()
  }

  /**
   * Update a row with response data
   * @param {Object} data - Response data
   */
  const updateWithResponseData = (data) => {
    httpOutgoingCount++
    $httpOutgoingCount.text(httpOutgoingCount)

    const request = httpRequests.get(data.id)
    if (!request) return

    request.response = data
    request.status = data.status
    request.size = data.size
    request.time = data.time
    request.modified = data.modified

    const $row = request.rowElement
    const statusClass = getStatusClass(data.status)
    const statusText = data.status || 'Failed'
    const modifiedBadge = data.modified
      ? '<span class="ml-1 px-1 rounded bg-custom-pink/20 text-custom-pink text-[10px]">MOD</span>'
      : ''

    $row.find('td:eq(3)').html(`<span class="${statusClass}">${statusText}</span>${modifiedBadge}`)
    $row.find('td:eq(5)').text(formatSize(data.size))
    $row.find('td:eq(6)').text(formatTime(data.time))

    if ($httpDetailsPanel.is(':visible') && selectedRequestId === data.id) {
      showRequestDetails(data.id)
    }
  }

  /**
   * Apply filters to HTTP log rows
   */
  const applyHttpFilters = () => {
    const typeFilter = $httpTypeFilter.val()
    const searchTerm = $httpSearch.val().toLowerCase()

    $('.http-row').each(function () {
      const $row = $(this)
      const rowType = $row.data('type')
      const rowText = $row.text().toLowerCase()

      const matchesType = typeFilter === 'all' || rowType === typeFilter
      const matchesSearch = !searchTerm || rowText.includes(searchTerm)

      $row.toggle(matchesType && matchesSearch)
    })
  }

  /**
   * Show details for a specific request
   * @param {string} requestId - Request ID
   */
  const showRequestDetails = (requestId) => {
    const requestData = httpRequests.get(requestId)
    if (!requestData) return

    selectedRequestId = requestId

    jam.application.modals.show('httpdetails', '#modalContainer', requestData)
  }

  window.addEventListener('open-http-override-dialog', (e) => {
    if (e.detail && e.detail.requestId) {
      openFileSelectionDialog(e.detail.requestId)
    }
  })

  /**
   * Handle context menu display
   * @param {Event} e - Mouse event
   * @param {HTMLElement} target - Target element
   */
  const showContextMenu = (e, target) => {
    e.preventDefault()

    const $row = $(target).closest('tr')
    const requestId = $row.data('id')

    if (!requestId) return

    selectedRequestId = requestId

    $httpContextMenu.css({
      left: e.pageX,
      top: e.pageY
    }).removeClass('hidden')

    $(document).one('click', () => {
      $httpContextMenu.addClass('hidden')
    })
  }

  /**
   * Open file selection dialog for modifying response
   * @param {string} requestId - Request ID
   */
  const openFileSelectionDialog = (requestId) => {
    const request = httpRequests.get(requestId)
    if (!request) return

    $('#selectedFilePath').text('No file selected')
    $('#fileSelector').val('')

    $fileSelectionDialog.removeClass('hidden')

    $('#browseFileBtn').off('click').on('click', () => {
      $('#fileSelector').click()
    })

    $('#fileSelector').off('change').on('change', function () {
      if (this.files.length > 0) {
        $('#selectedFilePath').text(this.files[0].path)
      } else {
        $('#selectedFilePath').text('No file selected')
      }
    })

    $('#confirmFileSelectionBtn').off('click').on('click', () => {
      const filePath = $('#fileSelector')[0].files[0]?.path
      if (filePath) {
        ipcRenderer.send('override-http-response', {
          requestId,
          filePath
        })

        const displayPath = request.path.split('?')[0]

        showToast(
          `Override set for "${path.basename(displayPath)}". Future requests for this resource will use your file.`,
          'info'
        )
      } else {
        showToast('No file selected', 'error')
      }
      $fileSelectionDialog.addClass('hidden')
    })

    $('#cancelFileSelectionBtn, #closeFileSelectionBtn').off('click').on('click', () => {
      $fileSelectionDialog.addClass('hidden')
    })
  }

  /**
   * Show a toast message
   * @param {string} message - Message text
   * @param {string} type - Toast type (success, error, info)
   */
  const showToast = (message, type = 'success') => {
    const colors = {
      success: 'bg-highlight-green text-white',
      error: 'bg-error-red text-white',
      info: 'bg-custom-blue text-white'
    }

    const $toast = $(`<div class="fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${colors[type] || colors.info}">${message}</div>`)
    $('body').append($toast)

    setTimeout(() => {
      $toast.fadeOut(300, function () { $(this).remove() })
    }, 3000)
  }

  $(document).on('click', '.http-row', function () {
    const requestId = $(this).data('id')
    if (requestId) {
      if ($httpDetailsPanel.is(':visible') && selectedRequestId === requestId) {
        $httpDetailsPanel.addClass('hidden')
        selectedRequestId = null
      } else {
        showRequestDetails(requestId)
      }
    }
  })

  $(document).on('contextmenu', '.http-row', function (e) {
    showContextMenu(e, this)
  })

  $('#menuCopyUrl').on('click', function () {
    const request = httpRequests.get(selectedRequestId)
    if (request) {
      clipboard.writeText(request.path)
      showToast('URL copied to clipboard', 'success')
    }
  })

  $('#menuViewDetails').on('click', function () {
    if (selectedRequestId) {
      showRequestDetails(selectedRequestId)
    }
  })

  $('#menuModifyResponse').on('click', function () {
    if (selectedRequestId) {
      openFileSelectionDialog(selectedRequestId)
    }
  })

  $('#menuSaveContent').on('click', function () {
    showToast('Save content feature coming soon', 'info')
  })

  $httpDetailsTabRequest.on('click', function () {
    if (selectedRequestId) {
      showRequestDetails(selectedRequestId, 'request')
    }
  })

  $httpDetailsTabResponse.on('click', function () {
    if (selectedRequestId) {
      showRequestDetails(selectedRequestId, 'response')
    }
  })

  $httpTypeFilter.on('change', applyHttpFilters)
  $httpSearch.on('input', applyHttpFilters)

  ipcRenderer.on('http-log', (event, data) => {
    switch (data.event) {
      case 'request':
        createRequestRow(data)
        break

      case 'response':
        updateWithResponseData(data)
        break

      case 'modified':
        const request = httpRequests.get(data.id)
        if (request) {
          request.modified = true
          showToast(`Modified response for ${path.basename(data.path)}`, 'info')
        }
        break
    }
  })

  $('#clearHttpLogsButton').on('click', function () {
    $httpLogBody.empty()
    httpRequests.clear()
    httpRequestCount = 0
    httpIncomingCount = 0
    httpOutgoingCount = 0
    $httpIncomingCount.text('0')
    $httpOutgoingCount.text('0')
    $httpTotalCount.text('0')

    if ($httpDetailsPanel.is(':visible')) {
      $httpDetailsPanel.addClass('hidden')
    }
  })

  $('#exportHttpLogsButton').on('click', function () {
    const logs = Array.from(httpRequests.values()).map(req => ({
      id: req.id,
      path: req.path,
      method: req.method,
      type: req.type,
      status: req.status,
      size: req.size,
      time: req.time,
      timestamp: req.timestamp,
      modified: req.modified || false
    }))

    if (logs.length === 0) {
      showToast('No HTTP logs to export', 'error')
      return
    }

    ipcRenderer.send('export-http-logs', logs)
  })
})()
