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
            Settings
          </h3>
          <button type="button" class="text-sidebar-text hover:text-text-primary" id="closeSettingsBtn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Tabs -->
        <div class="border-b border-sidebar-border">
          <nav class="flex px-4" aria-label="Tabs">
            <button id="networkTabBtn" class="px-4 py-3 text-sm font-medium border-b-2 border-custom-pink text-custom-pink">
              Network
            </button>
            <button id="repositoriesTabBtn" class="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-sidebar-text hover:text-text-primary">
              Repositories
            </button>
          </nav>
        </div>
        
        <!-- Tab Content -->
        <div class="p-5">
          <!-- Network Settings Content -->
          <div id="networkTab" class="space-y-4">
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
          
          <!-- Repositories Content -->
          <div id="repositoriesTab" class="space-y-4 hidden">
            <!-- Repository List -->
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-text-primary">
                  Plugin Repositories
                </label>
                <button id="addRepoBtn" class="text-xs bg-custom-pink px-2 py-1 rounded text-white hover:bg-custom-pink/90 transition">
                  <i class="fas fa-plus"></i> Add New
                </button>
              </div>
              
              <!-- Repository List with scroll -->
              <div class="border border-sidebar-border rounded bg-tertiary-bg/30 h-60 overflow-y-auto">
                <ul id="repoList" class="p-2 space-y-2 text-sm">
                  <!-- Repositories will be inserted here -->
                  <li class="text-center text-gray-400 p-4">Loading repositories...</li>
                </ul>
              </div>
              <p class="mt-1 text-xs text-gray-400">
                Repositories are sources for plugin downloads. The official repository is always included.
              </p>
            </div>
            
            <!-- Add Repository Form (hidden initially) -->
            <div id="addRepoForm" class="border border-sidebar-border rounded p-3 hidden">
              <h4 class="text-sm font-medium text-text-primary mb-2">Add Repository</h4>
              
              <div class="space-y-2">
                <div>
                  <label for="repoName" class="block text-xs text-text-primary">Name</label>
                  <input id="repoName" type="text" class="bg-tertiary-bg text-text-primary placeholder-text-primary focus:outline-none rounded px-3 py-2 w-full text-sm" placeholder="Repository name">
                </div>
                
                <div>
                  <label for="repoUsername" class="block text-xs text-text-primary">GitHub Username</label>
                  <input id="repoUsername" type="text" class="bg-tertiary-bg text-text-primary placeholder-text-primary focus:outline-none rounded px-3 py-2 w-full text-sm" placeholder="GitHub username">
                </div>
                
                <div>
                  <label for="repoRepository" class="block text-xs text-text-primary">GitHub Repository</label>
                  <input id="repoRepository" type="text" class="bg-tertiary-bg text-text-primary placeholder-text-primary focus:outline-none rounded px-3 py-2 w-full text-sm" placeholder="Repository name">
                </div>
                
                <div class="flex justify-end pt-2">
                  <button id="cancelAddRepoBtn" class="text-xs bg-sidebar-hover text-text-primary px-3 py-1 mr-2 rounded hover:bg-sidebar-hover/70 transition">
                    Cancel
                  </button>
                  <button id="saveAddRepoBtn" class="text-xs bg-custom-pink text-white px-3 py-1 rounded hover:bg-custom-pink/90 transition">
                    Save
                  </button>
                </div>
              </div>
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
  loadRepositories($modal, app)
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

  $modal.find('#networkTabBtn').on('click', () => {
    switchTab($modal, 'network')
  })

  $modal.find('#repositoriesTabBtn').on('click', () => {
    switchTab($modal, 'repositories')
  })

  $modal.find('#addRepoBtn').on('click', () => {
    $modal.find('#addRepoForm').removeClass('hidden')
    $modal.find('#repoName').focus()
  })

  $modal.find('#cancelAddRepoBtn').on('click', () => {
    $modal.find('#addRepoForm').addClass('hidden')
    $modal.find('#repoName').val('')
    $modal.find('#repoUsername').val('')
    $modal.find('#repoRepository').val('')
  })

  $modal.find('#saveAddRepoBtn').on('click', () => {
    const name = $modal.find('#repoName').val().trim()
    const username = $modal.find('#repoUsername').val().trim()
    const repository = $modal.find('#repoRepository').val().trim()

    if (!name || !username || !repository) {
      showToast('Please fill in all fields', 'warning')
      return
    }

    addRepository($modal, app, { name, username, repository })
    $modal.find('#addRepoForm').addClass('hidden')
    $modal.find('#repoName').val('')
    $modal.find('#repoUsername').val('')
    $modal.find('#repoRepository').val('')
  })
}

/**
 * Switch between settings tabs
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {string} tabName - The tab to show ('network' or 'repositories')
 */
function switchTab ($modal, tabName) {
  $modal.find('#networkTab, #repositoriesTab').addClass('hidden')
  $modal.find('#networkTabBtn, #repositoriesTabBtn').removeClass('border-custom-pink text-custom-pink').addClass('border-transparent text-sidebar-text')

  if (tabName === 'network') {
    $modal.find('#networkTab').removeClass('hidden')
    $modal.find('#networkTabBtn').removeClass('border-transparent text-sidebar-text').addClass('border-custom-pink text-custom-pink')
  } else if (tabName === 'repositories') {
    $modal.find('#repositoriesTab').removeClass('hidden')
    $modal.find('#repositoriesTabBtn').removeClass('border-transparent text-sidebar-text').addClass('border-custom-pink text-custom-pink')
  }
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
    showToast('Error loading settings', 'error')
  }
}

/**
 * Load repositories into the list
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 */
function loadRepositories ($modal, app) {
  try {
    const settings = app.settings && typeof app.settings.getAll === 'function' ? app.settings.getAll() : {}
    const repositories = settings.repositories || []

    const $repoList = $modal.find('#repoList')
    $repoList.empty()

    if (repositories.length === 0) {
      $repoList.append(`
        <li class="flex justify-between items-center p-2 rounded bg-tertiary-bg">
          <div class="flex items-center">
            <span class="w-4 h-4 flex items-center justify-center text-highlight-yellow">
              <i class="fas fa-star"></i>
            </span>
            <span class="ml-2 text-text-primary">Official</span>
          </div>
          <span class="text-gray-400 text-xs bg-tertiary-bg/80 px-1 rounded">Default</span>
        </li>
      `)
    } else {
      repositories.forEach((repo, index) => {
        const isOfficial = index === 0 || repo.name.toLowerCase() === 'official'
        const repoIcon = isOfficial ? 'fa-star' : 'fa-code-branch'
        const iconColor = isOfficial ? 'text-highlight-yellow' : 'text-custom-blue'
        const isRemovable = !isOfficial

        $repoList.append(`
          <li class="flex justify-between items-center p-2 rounded bg-tertiary-bg" data-index="${index}">
            <div class="flex items-center">
              <span class="w-4 h-4 flex items-center justify-center ${iconColor}">
                <i class="fas ${repoIcon}"></i>
              </span>
              <span class="ml-2 text-text-primary">${repo.name}</span>
            </div>
            <div>
              ${isRemovable
                ? `<button class="remove-repo-btn text-gray-400 hover:text-error-red transition ml-2">
                  <i class="fas fa-trash-alt"></i>
                </button>`
                : '<span class="text-gray-400 text-xs bg-tertiary-bg/80 px-1 rounded">Default</span>'
              }
            </div>
          </li>
        `)
      })
    }

    $repoList.find('.remove-repo-btn').on('click', function () {
      const index = $(this).closest('li').data('index')
      removeRepository($modal, app, index)
    })
  } catch (error) {
    showToast('Error loading repositories', 'error')
  }
}

/**
 * Add a new repository
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 * @param {Object} repo - The repository to add
 */
function addRepository ($modal, app, repo) {
  try {
    const settings = app.settings && typeof app.settings.getAll === 'function' ? app.settings.getAll() : {}
    const repositories = settings.repositories || []

    if (repositories.some(r => r.username === repo.username && r.repository === repo.repository)) {
      showToast('Repository with this username and repository already exists', 'warning')
      return
    }

    repositories.push(repo)

    if (!settings.repositories) {
      settings.repositories = repositories
    }

    if (app.settings && typeof app.settings.setAll === 'function') {
      app.settings.setAll(settings)
    }

    loadRepositories($modal, app)
    showToast('Repository added successfully', 'success')
  } catch (error) {
    showToast('Error adding repository', 'error')
  }
}

/**
 * Remove a repository
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 * @param {number} index - The index of the repository to remove
 */
function removeRepository ($modal, app, index) {
  try {
    const settings = app.settings && typeof app.settings.getAll === 'function' ? app.settings.getAll() : {}
    const repositories = settings.repositories || []

    if (index === 0) {
      showToast('Cannot remove the official repository', 'warning')
      return
    }

    repositories.splice(index, 1)

    settings.repositories = repositories

    if (app.settings && typeof app.settings.setAll === 'function') {
      app.settings.setAll(settings)
    }

    loadRepositories($modal, app)
    showToast('Repository removed successfully', 'success')
  } catch (error) {
    showToast('Error removing repository', 'error')
  }
}

/**
 * Save settings from the form
 * @param {JQuery<HTMLElement>} $modal - The modal element
 * @param {Application} app - The application instance
 */
function saveSettings ($modal, app) {
  try {
    const settings = app.settings && typeof app.settings.getAll === 'function' ? app.settings.getAll() : {}

    settings.smartfoxServer = $modal.find('#smartfoxServer').val()
    settings.secureConnection = $modal.find('#secureConnection').prop('checked')

    if (app.settings && typeof app.settings.setAll === 'function') {
      app.settings.setAll(settings)
    }

    app.modals.close()
    showToast('Settings saved successfully')
  } catch (error) {
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
