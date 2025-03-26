exports.name = 'pluginLibraryModal'

/**
 * Render the Plugin Library Modal
 * @param {Application} app - The application instance
 * @returns {JQuery<HTMLElement>} The rendered modal element
 */
exports.render = function (app) {
  const path = require('path')
  const fs = require('fs')

  const CACHE_KEY = 'jam-plugins-cache'
  const CACHE_TIME_KEY = 'jam-plugins-cache-time'
  const CACHE_METADATA_KEY = 'jam-plugins-metadata-cache'
  const CACHE_DURATION = 3600000

  const GITHUB_API_URL = 'https://api.github.com/repos/Sxip/jam/contents/plugins'
  const LOCAL_PLUGINS_DIR = path.resolve('plugins/')

  const $modal = $(`
    <div class="flex items-center justify-center min-h-screen p-4" style="z-index: 9999;">
      <!-- Modal Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity" id="modalBackdrop" style="z-index: 9000;"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-secondary-bg rounded-lg shadow-xl max-w-5xl w-full" style="z-index: 9100;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-4 border-b border-sidebar-border">
          <h3 class="text-lg font-semibold text-text-primary">
            <i class="fas fa-puzzle-piece text-highlight-green mr-2"></i>
            Plugin Library
          </h3>
        </div>
        
        <!-- Search Bar -->
        <div class="px-4 py-3 border-b border-sidebar-border">
          <div class="relative">
            <input type="text" id="pluginSearch" placeholder="Search plugins..." 
              class="w-full bg-tertiary-bg text-text-primary placeholder-gray-400 p-2 pl-8 rounded-md focus:outline-none">
            <div class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
              <i class="fas fa-search"></i>
            </div>
          </div>
        </div>
        
        <!-- Modal Body -->
        <div class="p-5 h-[400px] overflow-y-auto">
          <div id="pluginsList" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="col-span-full flex justify-center items-center h-32">
              <i class="fas fa-circle-notch fa-spin text-gray-400 mr-2"></i>
              <span class="text-gray-400">Loading plugins...</span>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="flex items-center justify-between p-4 border-t border-sidebar-border">
          <div>
            <span class="text-sm text-gray-400">
              <i class="fas fa-info-circle mr-1"></i>
              Plugins are loaded from the official repository
            </span>
          </div>
          <div class="flex space-x-2">
            <button type="button" class="text-xs text-gray-400 hover:text-highlight-green transition px-2 py-1 rounded" id="refreshPluginsBtn">
              <i class="fas fa-sync-alt mr-1"></i> Refresh
            </button>
            <button type="button" class="bg-tertiary-bg text-text-primary px-3 py-1 rounded hover:bg-sidebar-hover/70 transition" id="closeModalBtn">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `)

  const closeHandler = () => {
    if (typeof app.modals === 'object' && typeof app.modals.close === 'function') {
      app.modals.close()
    }
  }

  $modal.find('#closeLibraryModalBtn, #closeModalBtn').on('click', closeHandler)

  $modal.find('#modalBackdrop').on('click', function () {
    app.modals.close()
  })

  $modal.find('#refreshPluginsBtn').on('click', function () {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_TIME_KEY)
    localStorage.removeItem(CACHE_METADATA_KEY)
    fetchPlugins(true)
  })

  /**
   * Check if a plugin is installed locally
   * @param {string} pluginName - Name of the plugin to check
   * @returns {boolean} - True if installed
   */
  const isPluginInstalled = (pluginName) => {
    try {
      const pluginPath = path.join(LOCAL_PLUGINS_DIR, pluginName)
      return fs.existsSync(pluginPath)
    } catch (error) {
      console.error('Error checking if plugin is installed:', error)
      return false
    }
  }

  /**
   * Get metadata for a plugin from cache or GitHub
   * @param {Object} plugin - Plugin object from GitHub API
   * @returns {Promise<Object>} - Plugin metadata
   */
  const fetchPluginMetadata = async (plugin) => {
    try {
      const metadataCache = localStorage.getItem(CACHE_METADATA_KEY)
      if (metadataCache) {
        const parsedCache = JSON.parse(metadataCache)
        if (parsedCache[plugin.name]) {
          return parsedCache[plugin.name]
        }
      }

      const pluginJsonUrl = `https://api.github.com/repos/Sxip/jam/contents/plugins/${plugin.name}/plugin.json`
      const response = await fetch(pluginJsonUrl)

      if (response.ok) {
        const data = await response.json()
        const content = atob(data.content)
        const metadata = JSON.parse(content)

        if (!metadata.author) {
          metadata.author = 'Sxip'
        }

        cachePluginMetadata(plugin.name, metadata)
        return metadata
      }

      return {
        name: plugin.name,
        description: 'A plugin for Jam',
        author: 'Sxip'
      }
    } catch (error) {
      return {
        name: plugin.name,
        description: 'A plugin for Jam',
        author: 'Sxip'
      }
    }
  }

  /**
   * Cache a plugin's metadata
   * @param {string} pluginName - Name of the plugin
   * @param {Object} metadata - Plugin metadata to cache
   */
  const cachePluginMetadata = (pluginName, metadata) => {
    try {
      const existingCache = localStorage.getItem(CACHE_METADATA_KEY) || '{}'
      const cacheData = JSON.parse(existingCache)

      cacheData[pluginName] = metadata
      localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error('Error caching plugin metadata:', error)
    }
  }

  /**
   * Uninstall a plugin by removing its directory
   * @param {string} pluginName - Name of the plugin to uninstall
   */
  const uninstallPlugin = async (pluginName) => {
    try {
      app.consoleMessage({
        message: `Uninstalling plugin: ${pluginName}...`,
        type: 'wait'
      })

      const pluginDir = path.join(LOCAL_PLUGINS_DIR, pluginName)

      if (!fs.existsSync(pluginDir)) {
        throw new Error(`Plugin "${pluginName}" is not installed`)
      }

      const deleteDirectory = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file)
            if (fs.lstatSync(curPath).isDirectory()) {
              deleteDirectory(curPath)
            } else {
              fs.unlinkSync(curPath)
            }
          })
          fs.rmdirSync(dirPath)
        }
      }

      deleteDirectory(pluginDir)

      app.consoleMessage({
        message: `Plugin "${pluginName}" has been successfully uninstalled.`,
        type: 'success'
      })

      if (typeof app.dispatch.loadPlugins === 'function') {
        app.dispatch.loadPlugins()
      }

      fetchPlugins(true)
    } catch (error) {
      app.consoleMessage({
        message: `Failed to uninstall plugin "${pluginName}": ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Install a plugin from GitHub
   * @param {Object} plugin - Plugin object from GitHub API
   */
  const installPlugin = async (plugin) => {
    try {
      app.consoleMessage({
        message: `Installing plugin: ${plugin.name}...`,
        type: 'wait'
      })

      const pluginDir = path.join(LOCAL_PLUGINS_DIR, plugin.name)
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true })
      }

      const response = await fetch(plugin.url)

      if (!response.ok) {
        if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
          const resetTime = response.headers.get('X-RateLimit-Reset')
          const resetDate = new Date(resetTime * 1000)
          throw new Error(`GitHub rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}.`)
        }
        throw new Error(`Failed to fetch plugin contents: ${response.statusText}`)
      }

      const contents = await response.json()

      for (const file of contents) {
        if (file.type === 'file') {
          const fileResponse = await fetch(file.download_url)

          if (!fileResponse.ok) {
            throw new Error(`Failed to download ${file.name}: ${fileResponse.statusText}`)
          }

          const fileContent = await fileResponse.text()
          fs.writeFileSync(path.join(pluginDir, file.name), fileContent)
        }
      }

      app.modals.close()
      app.consoleMessage({
        message: `Plugin "${plugin.name}" has been successfully installed.`,
        type: 'success'
      })

      if (typeof app.dispatch.loadPlugins === 'function') {
        app.dispatch.loadPlugins()
      }
    } catch (error) {
      app.consoleMessage({
        message: `Failed to install plugin "${plugin.name}": ${error.message}`,
        type: 'error'
      })
    }
  }

  /**
   * Fetch plugins list from cache or GitHub
   * @param {boolean} forceRefresh - Force refresh ignoring cache
   */
  const fetchPlugins = async (forceRefresh = false) => {
    const $pluginsList = $modal.find('#pluginsList')

    try {
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(CACHE_KEY)
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY)
        const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity

        if (cachedData && cacheAge < CACHE_DURATION) {
          const plugins = JSON.parse(cachedData)
          await displayPlugins(plugins)
          return
        }
      }

      $pluginsList.html(`
        <div class="col-span-full flex justify-center items-center h-32">
          <i class="fas fa-circle-notch fa-spin text-gray-400 mr-2"></i>
          <span class="text-gray-400">Loading plugins...</span>
        </div>
      `)

      const response = await fetch(GITHUB_API_URL)

      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
        if (rateLimitRemaining === '0') {
          const resetTime = response.headers.get('X-RateLimit-Reset')
          const resetDate = new Date(resetTime * 1000)
          $pluginsList.html(`
            <div class="col-span-full text-center text-error-red p-4">
              <i class="fas fa-exclamation-circle mr-2"></i>
              GitHub rate limit exceeded. Try again after ${resetDate.toLocaleTimeString()}.
            </div>
          `)
          return
        }
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`)
      }

      const plugins = await response.json()

      localStorage.setItem(CACHE_KEY, JSON.stringify(plugins))
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString())
      await displayPlugins(plugins)
    } catch (error) {
      $pluginsList.html(`
        <div class="col-span-full text-center text-error-red p-4">
          <i class="fas fa-exclamation-circle mr-2"></i>
          Error fetching plugins: ${error.message}
        </div>
      `)
    }
  }

  /**
   * Display plugins in the UI
   * @param {Array} plugins - List of plugins from GitHub API
   */
  const displayPlugins = async (plugins) => {
    const $pluginsList = $modal.find('#pluginsList')
    $pluginsList.empty()

    if (!plugins || plugins.length === 0) {
      $pluginsList.html('<div class="col-span-full text-center text-gray-400">No plugins found</div>')
      return
    }

    const pluginPromises = plugins
      .filter(plugin => plugin.type === 'dir')
      .map(async plugin => {
        const installed = isPluginInstalled(plugin.name)
        const metadata = await fetchPluginMetadata(plugin)

        return {
          plugin,
          installed,
          metadata
        }
      })

    try {
      const pluginData = await Promise.all(pluginPromises)

      pluginData.forEach(({ plugin, installed, metadata }) => {
        $pluginsList.append(`
          <div class="bg-tertiary-bg/30 rounded-lg p-4 border border-sidebar-border hover:border-highlight-green transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
            <div class="flex justify-between items-start mb-3">
              <div>
                <div class="flex items-center">
                  <i class="fas fa-puzzle-piece text-highlight-green mr-2 text-lg"></i>
                  <h4 class="text-text-primary font-medium text-base">${metadata.name || plugin.name}</h4>
                  ${metadata.version ? `<span class="ml-2 text-xs text-gray-400">v${metadata.version}</span>` : ''}
                </div>
                <div class="mt-1 text-xs text-gray-400">
                  <i class="fas fa-user mr-1"></i> ${metadata.author}
                </div>
              </div>
              <div>
                <span class="px-2 py-1 text-xs rounded-full ${installed ? 'bg-highlight-green/20 text-highlight-green' : 'bg-error-red/20 text-error-red'}">
                  ${installed ? 'Installed' : 'Not Installed'}
                </span>
              </div>
            </div>
            
            <div class="mt-3 mb-4">
              <p class="text-gray-400 text-sm">
                ${metadata.description || 'A plugin for Jam'}
              </p>
            </div>
            
            <div class="flex justify-end items-center mt-4 pt-2 border-t border-sidebar-border/30">
              <div class="flex gap-2">
                <button type="button" data-repo-url="${plugin.html_url}" class="view-repo-btn text-xs text-gray-400 hover:text-highlight-green transition px-2 py-1 rounded">
                  <i class="fab fa-github mr-1"></i> View Repository
                </button>
                
                ${!installed
                  ? `<button data-plugin="${encodeURIComponent(JSON.stringify(plugin))}" class="install-plugin-btn px-3 py-1 text-xs bg-highlight-green/20 text-highlight-green rounded hover:bg-highlight-green/30 transition">
                    <i class="fas fa-download mr-1"></i> Install
                  </button>`
                  : `<button data-plugin-name="${plugin.name}" class="uninstall-plugin-btn px-3 py-1 text-xs bg-error-red/20 text-error-red rounded hover:bg-error-red/30 transition">
                    <i class="fas fa-trash-alt mr-1"></i> Uninstall
                  </button>`
                }
              </div>
            </div>
          </div>
        `)
      })

      $pluginsList.find('.install-plugin-btn').on('click', function () {
        const plugin = JSON.parse(decodeURIComponent($(this).data('plugin')))
        installPlugin(plugin)
      })

      $pluginsList.find('.uninstall-plugin-btn').on('click', function () {
        const pluginName = $(this).data('plugin-name')

        if (confirm(`Are you sure you want to uninstall the "${pluginName}" plugin?`)) {
          uninstallPlugin(pluginName)
        }
      })

      $pluginsList.find('.view-repo-btn').on('click', function () {
        const repoUrl = $(this).data('repo-url')
        app.open(repoUrl)
      })
    } catch (error) {
      console.error('Error displaying plugins:', error)
      $pluginsList.html(`
        <div class="col-span-full text-center text-error-red p-4">
          <i class="fas fa-exclamation-circle mr-2"></i>
          Error loading plugin details: ${error.message}
        </div>
      `)
    }

    $modal.find('#pluginSearch').on('input', function () {
      const searchTerm = $(this).val().toLowerCase()

      $pluginsList.find('[data-plugin-name]').each(function () {
        const pluginName = $(this).data('plugin-name')
        if (pluginName.includes(searchTerm)) {
          $(this).show()
        } else {
          $(this).hide()
        }
      })
    })
  }

  fetchPlugins()
  return $modal
}
