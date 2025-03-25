/**
 * Module name
 * @type {string}
 */
exports.name = 'settings'

/**
 * Render the settings modal
 * @param {Application} app - The application instance
 * @param {Object} data - Additional data passed to the modal
 * @returns {JQuery<HTMLElement>} The rendered modal element
 */
exports.render = function (app, data = {}) {
  const $modal = $(`
    <div class="flex items-center justify-center min-h-screen p-4">
      <!-- Modal Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-secondary-bg rounded-lg shadow-xl max-w-md w-full">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h3 class="text-lg font-semibold text-text-primary">
            <i class="fas fa-cog text-highlight-yellow mr-2"></i>
            Network Settings
          </h3>
          <button type="button" class="text-sidebar-text hover:text-text-primary" id="closeSettingsBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-5">
          <!-- Network Settings Content -->
          <div class="space-y-4">
            <!-- Server IP -->
            <div>
              <label for="smartfoxServer" class="block mb-2 text-sm font-medium text-text-primary">
                Server IP
              </label>
              <input id="smartfoxServer" type="text"
                class="bg-tertiary-bg text-text-primary placeholder-text-primary focus:outline-none rounded px-3 py-2 w-full"
                placeholder="lb-iss02-classic-prod.animaljam.com">
              <p class="mt-1 text-xs text-gray-400">Animal Jam server address</p>
            </div>
            
            <!-- Secure Connection -->
            <div class="flex items-center mt-4 bg-tertiary-bg/30 p-3 rounded">
              <input id="secureConnection" type="checkbox" 
                class="w-4 h-4 bg-tertiary-bg rounded focus:ring-custom-pink">
              <label for="secureConnection" class="ml-2 text-sm text-text-primary">
                Use secure connection (SSL/TLS)
              </label>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="flex items-center justify-end p-4 border-t border-sidebar-border">
          <button type="button" class="bg-sidebar-hover text-text-primary px-4 py-2 mr-2 rounded hover:bg-sidebar-hover/70 transition" id="cancelSettingsBtn">
            Cancel
          </button>
          <button type="button" class="bg-custom-pink text-white px-4 py-2 rounded hover:bg-custom-pink/90 transition" id="saveSettingsBtn">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  `)

  setupEventHandlers($modal, app)
  loadSettings($modal, app)
  return $modal
}

/**
 * Close handler for the settings modal
 * @param {Application} app - The application instance
 */
exports.close = function (app) {
  // Cleanup
}

/**
 * Setup event handlers for the settings modal
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 */
function setupEventHandlers ($modal, app) {
  $modal.find('#closeSettingsBtn, #cancelSettingsBtn').on('click', () => {
    app.modals.close()
  })

  $modal.find('#saveSettingsBtn').on('click', () => {
    saveSettings($modal, app)
  })
}

/**
 * Load settings into the form
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 */
function loadSettings ($modal, app) {
  try {
    const settings = {}

    if (app.settings && typeof app.settings.getAll === 'function') {
      Object.assign(settings, app.settings.getAll())
    }

    $modal.find('#smartfoxServer').val(settings.smartfoxServer || 'lb-iss02-classic-prod.animaljam.com')
    $modal.find('#secureConnection').prop('checked', settings.secureConnection === true)
  } catch (error) {
    console.error('Error loading settings:', error)
    showToast('Error loading settings', 'error')
  }
}

/**
 * Save settings from the form
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 */
function saveSettings ($modal, app) {
  try {
    const settings = {
      smartfoxServer: $modal.find('#smartfoxServer').val(),
      secureConnection: $modal.find('#secureConnection').prop('checked')
    }

    if (app.settings && typeof app.settings.setAll === 'function') {
      app.settings.setAll(settings)
    } else {
      console.warn('No settings.setAll method available on app')
    }

    app.modals.close()
    showToast('Settings saved successfully')
  } catch (error) {
    console.error('Error saving settings:', error)
    showToast('Error saving settings', 'error')
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to show
 * @param {string} type - The type of notification (success, error, warning)
 */
function showToast (message, type = 'success') {
  const colors = {
    success: 'bg-highlight-green text-white',
    error: 'bg-error-red text-white',
    warning: 'bg-custom-blue text-white'
  }

  const toast = $(`<div class="fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg z-50 ${colors[type]}">${message}</div>`)
  $('body').append(toast)

  setTimeout(() => {
    toast.fadeOut(300, function () { $(this).remove() })
  }, 3000)
}
