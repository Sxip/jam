exports.name = 'plugins'

/**
 * Render the Plugin Library Modal
 * @param {Application} app - The application instance
 * @returns {JQuery<HTMLElement>} The rendered modal element
 */
exports.render = function (app) {
  const path = require('path')
  const fs = require('fs')
  const marked = require('marked')

  const CACHE_KEY_PREFIX = 'jam-plugins-cache-'
  const CACHE_TIME_KEY_PREFIX = 'jam-plugins-cache-time-'
  const CACHE_METADATA_KEY_PREFIX = 'jam-plugins-metadata-cache-'
  const CACHE_DURATION = 3600000

  const LOCAL_PLUGINS_DIR = path.resolve('plugins/')

  let repositories = []
  try {
    const settings = JSON.parse(fs.readFileSync(path.resolve('settings.json')))
    repositories = settings.repositories || []

    if (repositories.length === 0) {
      repositories.push({
        name: 'Jam',
        username: 'sxip',
        repository: 'plugins',
        isOfficial: true
      })
    } else {
      repositories = repositories.map((repo) => {
        if (repo.username && repo.repository) {
          repo.url = `https://api.github.com/repos/${repo.username}/${repo.repository}/contents`
        }

        const isOfficial = (
          repo.username === 'sxip' &&
          repo.repository === 'plugins'
        )

        return {
          ...repo,
          name: repo.name || 'Repository',
          isOfficial
        }
      })
    }
  } catch (error) {
    repositories = [{
      name: 'Official',
      username: 'sxip',
      repository: 'plugins',
      url: 'https://api.github.com/repos/sxip/plugins/contents',
      isOfficial: true
    }]
  }

  const repoTabsHTML = repositories.map((repo, index) => {
    const activeClass = index === 0 ? 'bg-tertiary-bg' : 'text-gray-400'
    const repoIcon = repo.isOfficial ? 'fa-star' : 'fa-code-branch'

    return `
      <button type="button" data-repo-index="${index}" data-repo-url="${repo.url}" 
        class="repo-tab flex items-center px-4 py-2 text-sm rounded-md ${activeClass} hover:bg-tertiary-bg transition">
        <i class="fas ${repoIcon} mr-1"></i> ${repo.name}
      </button>
    `
  }).join('')

  const $modal = $(`
    <div class="flex items-center justify-center min-h-screen p-4" style="z-index: 9999;">
      <!-- Modal Backdrop -->
      <div class="fixed inset-0 bg-black/50 transition-opacity" id="modalBackdrop" style="z-index: 9000;"></div>
      
      <!-- Modal Content - Compact but with grid system -->
      <div class="relative bg-secondary-bg rounded-lg shadow-xl max-w-4xl w-full" style="z-index: 9100;">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-3 border-b border-sidebar-border">
          <h3 class="text-base font-semibold text-text-primary">
            <i class="fas fa-puzzle-piece text-highlight-green mr-2"></i>
            Plugin Hub
          </h3>
          <button type="button" id="closeModalBtn" class="text-gray-400 hover:text-text-primary p-1 rounded-full hover:bg-tertiary-bg/50 transition-colors">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <!-- Repository Tabs - More compact -->
        <div class="px-3 py-2 border-b border-sidebar-border">
          <div class="flex space-x-2 overflow-x-auto pb-1">
            ${repoTabsHTML}
          </div>
        </div>
        
        <!-- Search Bar - Reduced padding -->
        <div class="px-3 py-2 border-b border-sidebar-border">
          <div class="relative">
            <input type="text" id="pluginSearch" placeholder="Search plugins..." 
              class="w-full bg-tertiary-bg text-text-primary placeholder-gray-400 p-1.5 pl-7 rounded-md focus:outline-none text-sm">
            <div class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
              <i class="fas fa-search text-xs"></i>
            </div>
          </div>
        </div>
        
        <!-- Modal Body - Grid layout but reduced height -->
        <div class="p-3 h-[340px] overflow-y-auto">
          <div id="pluginsList" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="col-span-full flex justify-center items-center h-32">
              <i class="fas fa-circle-notch fa-spin text-gray-400 mr-2"></i>
              <span class="text-gray-400">Loading plugins...</span>
            </div>
          </div>
        </div>
        
        <!-- Modal Footer - More compact -->
        <div class="flex items-center justify-between p-2.5 border-t border-sidebar-border">
          <div>
            <span class="text-xs text-gray-400">
              <i class="fas fa-info-circle mr-1"></i>
              <span id="repoSourceInfo">Plugins are loaded from the official repository</span>
            </span>
          </div>
          <div class="flex space-x-2">
            <button type="button" class="text-xs text-gray-400 hover:text-highlight-green transition px-2 py-0.5 rounded" id="refreshPluginsBtn">
              <i class="fas fa-sync-alt mr-1"></i> Refresh
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

  let activeRepoIndex = 0
  const getActiveRepo = () => repositories[activeRepoIndex]

  $modal.find('.repo-tab').on('click', function () {
    const repoIndex = parseInt($(this).data('repo-index'))
    if (repoIndex === activeRepoIndex) return

    $modal.find('.repo-tab').removeClass('bg-tertiary-bg text-highlight-green').addClass('text-gray-400')
    $(this).addClass('bg-tertiary-bg text-highlight-green').removeClass('text-gray-400')

    activeRepoIndex = repoIndex
    updateRepoSourceInfo()
    fetchPlugins()
  })

  const updateRepoSourceInfo = () => {
    const repo = getActiveRepo()
    const infoText = repo.isOfficial
      ? 'Plugins are loaded from the official repository'
      : `Plugins are loaded from ${repo.name} repository`

    $modal.find('#repoSourceInfo').text(infoText)
  }

  $modal.find('#refreshPluginsBtn').on('click', function () {
    const repo = getActiveRepo()
    const cacheKey = `${CACHE_KEY_PREFIX}${repo.url}`
    const cacheTimeKey = `${CACHE_TIME_KEY_PREFIX}${repo.url}`
    const cacheMetadataKey = `${CACHE_METADATA_KEY_PREFIX}${repo.url}`

    localStorage.removeItem(cacheKey)
    localStorage.removeItem(cacheTimeKey)
    localStorage.removeItem(cacheMetadataKey)
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
      return false
    }
  }

  /**
   * Get metadata for a plugin from cache or GitHub
   * @param {Object} plugin - Plugin object from GitHub API
   * @returns {Promise<Object>} - Plugin metadata
   */
  const fetchPluginMetadata = async (plugin) => {
    const repo = getActiveRepo()
    const cacheMetadataKey = `${CACHE_METADATA_KEY_PREFIX}${repo.url || `${repo.username}/${repo.repository}`}`

    try {
      const metadataCache = localStorage.getItem(cacheMetadataKey)
      if (metadataCache) {
        const parsedCache = JSON.parse(metadataCache)
        if (parsedCache[plugin.name]) {
          return parsedCache[plugin.name]
        }
      }

      const repoOwner = repo.username
      const repoName = repo.repository

      const pluginJsonUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${plugin.name}/plugin.json`
      const response = await fetch(pluginJsonUrl)

      if (response.ok) {
        const data = await response.json()
        const content = atob(data.content)
        const metadata = JSON.parse(content)

        if (!metadata.author) {
          metadata.author = 'Sxip'
        }

        const existingCache = localStorage.getItem(cacheMetadataKey) || '{}'
        const parsedCache = JSON.parse(existingCache)
        parsedCache[plugin.name] = metadata
        localStorage.setItem(cacheMetadataKey, JSON.stringify(parsedCache))

        return metadata
      }

      return {
        name: plugin.name,
        description: 'A plugin for Jam',
        author: 'Unknown'
      }
    } catch (error) {
      return {
        name: plugin.name,
        description: 'A plugin for Jam',
        author: 'Unknown'
      }
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
    const repo = getActiveRepo()

    const cacheKeyIdentifier = repo.url || `${repo.username}/${repo.repository}`
    const cacheKey = `${CACHE_KEY_PREFIX}${cacheKeyIdentifier}`
    const cacheTimeKey = `${CACHE_TIME_KEY_PREFIX}${cacheKeyIdentifier}`

    try {
      if (!forceRefresh) {
        const cachedData = localStorage.getItem(cacheKey)
        const cacheTime = localStorage.getItem(cacheTimeKey)
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

      let apiUrl
      if (repo.username && repo.repository) {
        apiUrl = `https://api.github.com/repos/${repo.username}/${repo.repository}/contents`
      } else if (repo.url) {
        apiUrl = repo.url
      } else {
        throw new Error('Repository configuration is invalid')
      }

      const response = await fetch(apiUrl)

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

      localStorage.setItem(cacheKey, JSON.stringify(plugins))
      localStorage.setItem(cacheTimeKey, Date.now().toString())
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
   * Fetch and display a plugin's README
   * @param {string} pluginName - Name of the plugin
   * @param {Object} repo - Repository information
   */
  const viewPluginReadme = async (pluginName, repo) => {
    try {
      const repoOwner = repo.username
      const repoName = repo.repository

      const README_CACHE_KEY_PREFIX = 'jam-plugins-readme-cache-'
      const README_CACHE_TIME_KEY_PREFIX = 'jam-plugins-readme-cache-time-'
      const cacheKeyIdentifier = `${repoOwner}/${repoName}/${pluginName}`
      const readmeCacheKey = `${README_CACHE_KEY_PREFIX}${cacheKeyIdentifier}`
      const cacheTimeKey = `${README_CACHE_TIME_KEY_PREFIX}${cacheKeyIdentifier}`

      const cachedReadme = localStorage.getItem(readmeCacheKey)
      const cacheTime = localStorage.getItem(cacheTimeKey)
      const cacheAge = cacheTime ? Date.now() - parseInt(cacheTime) : Infinity

      let content = null

      if (cachedReadme && cacheAge < CACHE_DURATION) {
        content = cachedReadme
      } else {
        const readmeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${pluginName}/README.md`
        const response = await fetch(readmeUrl)

        if (!response.ok) {
          throw new Error('No README found for this plugin')
        }

        const data = await response.json()
        content = atob(data.content)

        localStorage.setItem(readmeCacheKey, content)
        localStorage.setItem(cacheTimeKey, Date.now().toString())
      }

      const $readmeModal = $(`
        <div class="fixed inset-0 flex items-center justify-center z-[10000] p-4">
          <div class="fixed inset-0 bg-black/70 transition-opacity"></div>
          <div class="relative bg-secondary-bg rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden z-[10001]">
            <!-- Header -->
            <div class="flex items-center justify-between p-3 border-b border-sidebar-border">
              <h3 class="text-base font-semibold text-text-primary">
                <i class="fas fa-book text-highlight-green mr-2"></i>
                ${pluginName} - README
              </h3>
              <button type="button" class="close-readme-modal text-gray-400 hover:text-text-primary p-1 rounded-full hover:bg-tertiary-bg/50 transition-colors">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <!-- Content -->
            <div class="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <div class="readme-content prose prose-sm prose-invert max-w-none">
                ${marked.parse(content, { gfm: true, breaks: true })}
              </div>
            </div>
          </div>
        </div>
      `)

      $('body').append($readmeModal)

      $readmeModal.find('.close-readme-modal').on('click', function () {
        $readmeModal.remove()
      })

      $readmeModal.on('click', function (e) {
        if ($(e.target).hasClass('fixed') && !$(e.target).hasClass('rounded-lg')) {
          $readmeModal.remove()
        }
      })
    } catch (error) {
      app.consoleMessage({
        message: `Couldn't load README: ${error.message}`,
        type: 'error'
      })
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

    const repo = getActiveRepo()
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
        const verifiedBadge = repo.isOfficial
          ? `<span class="ml-1 px-1 py-0.5 text-xs rounded bg-highlight-green/20 text-highlight-green">
            <i class="fas fa-check-circle text-xs mr-1"></i>Verified
          </span>`
          : ''

        $pluginsList.append(`
          <div class="bg-tertiary-bg/30 rounded-lg p-2.5 border border-sidebar-border hover:border-highlight-green transition-colors" data-plugin-name="${plugin.name.toLowerCase()}">
            <div class="flex justify-between items-start">
              <div class="flex items-center">
                <i class="fas fa-puzzle-piece text-highlight-green mr-2 text-sm"></i>
                <div>
                  <h4 class="text-text-primary font-medium text-sm flex items-center flex-wrap">
                    ${metadata.name || plugin.name}
                    ${metadata.version ? `<span class="ml-1 text-xs text-gray-400">v${metadata.version}</span>` : ''}
                  </h4>
                  <div class="text-xs text-gray-400">
                    <i class="fas fa-user mr-1"></i> ${metadata.author}
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end">
                ${verifiedBadge}
              </div>
            </div>
            
            <div class="mt-2 mb-2">
              <p class="text-gray-400 text-xs line-clamp-2 h-8">
                ${metadata.description || 'A plugin for Jam'}
              </p>
            </div>
            
            <div class="flex justify-end items-center mt-1 pt-1 border-t border-sidebar-border/30">
              <div class="flex gap-1">
                <button type="button" data-plugin-name="${plugin.name}" class="view-readme-btn text-xs text-gray-400 hover:text-highlight-green transition px-1.5 py-0.5 rounded">
                  <i class="fas fa-book mr-1 text-xs"></i> README
                </button>
                
                <button type="button" data-repo-url="${plugin.html_url}" class="view-repo-btn text-xs text-gray-400 hover:text-highlight-green transition px-1.5 py-0.5 rounded">
                  <i class="fab fa-github mr-1 text-xs"></i> View
                </button>
                
                ${!installed
                  ? `<button data-plugin="${encodeURIComponent(JSON.stringify(plugin))}" class="install-plugin-btn px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition">
                    <i class="fas fa-download mr-1 text-xs"></i> Install
                  </button>`
                  : `<button data-plugin-name="${plugin.name}" class="uninstall-plugin-btn px-2 py-0.5 text-xs bg-error-red/20 text-error-red rounded hover:bg-error-red/30 transition">
                    <i class="fas fa-trash-alt mr-1 text-xs"></i> Uninstall
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

      $pluginsList.find('.view-readme-btn').on('click', function () {
        const pluginName = $(this).data('plugin-name')
        viewPluginReadme(pluginName, repo)
      })
    } catch (error) {
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

  updateRepoSourceInfo()
  fetchPlugins()
  return $modal
}
