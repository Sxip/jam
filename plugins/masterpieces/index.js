module.exports = function ({ application, dispatch }) {
  dispatch.onCommand({
    name: 'masterpieces',
    description: 'Search and view Animal Jam masterpieces',
    callback: () => {
      application.modals.show('masterpiecesModal')
    }
  })

  application.modals.register('masterpiecesModal', {
    name: 'masterpiecesModal',

    render: function (app) {
      const $modal = $(`
        <div class="flex flex-col h-full bg-secondary-bg border border-sidebar-border rounded-md overflow-hidden">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-4 bg-secondary-bg border-b border-sidebar-border">
            <h3 class="text-lg font-medium text-text-primary">
              <i class="fas fa-palette text-highlight-yellow mr-2"></i>
              Masterpieces Viewer
            </h3>
            <button class="text-sidebar-text hover:text-error-red transition-colors" id="closeBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <!-- Modal Body -->
          <div class="p-4 flex-1 overflow-auto bg-primary-bg">
            <!-- Search Form -->
            <div class="flex flex-col md:flex-row gap-4 mb-6 bg-secondary-bg p-4 rounded-md border border-sidebar-border">
              <div class="flex-1">
                <label for="mp-username" class="block text-xs text-gray-400 mb-1">Username</label>
                <input type="text" id="mp-username" placeholder="Enter a username..." 
                  class="w-full bg-tertiary-bg border border-sidebar-border/30 rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight-green">
              </div>
              <div class="md:w-1/3">
                <label for="mp-gameType" class="block text-xs text-gray-400 mb-1">Game</label>
                <select id="mp-gameType" 
                  class="w-full bg-tertiary-bg border border-sidebar-border/30 rounded px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight-green">
                  <option value="flash">Animal Jam Classic</option>
                  <option value="mobile">Play Wild</option>
                </select>
              </div>
              <div class="self-end">
                <button id="mp-searchBtn" 
                  class="bg-highlight-green text-white px-4 py-2 rounded hover:bg-highlight-green/90 transition">
                  <i class="fas fa-search mr-1"></i> Search
                </button>
              </div>
            </div>
            
            <!-- Results -->
            <div id="mp-searchStatus" class="hidden text-center py-4 bg-secondary-bg rounded-md mb-4 border border-sidebar-border text-text-primary">
              <i class="fas fa-circle-notch fa-spin mr-2"></i>
              Searching for masterpieces...
            </div>
            
            <div id="mp-searchResults" class="hidden bg-secondary-bg p-4 rounded-md border border-sidebar-border">
              <h4 class="text-sm text-gray-400 mb-2">Results</h4>
              <div id="mp-resultsGrid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1"></div>
            </div>
            
            <div id="mp-noResults" class="hidden text-center py-4 bg-secondary-bg rounded-md border border-sidebar-border text-gray-400">
              <i class="fas fa-exclamation-circle mr-2"></i>
              No masterpieces found
            </div>
          </div>
        </div>
      `)

      const $imagePreview = $(`
        <div id="mp-imagePreview" class="fixed inset-0 bg-black/80 z-50 hidden flex items-center justify-center p-4">
          <div class="relative max-w-4xl max-h-full bg-secondary-bg p-2 rounded-lg border border-sidebar-border">
            <img src="" alt="Masterpiece Preview" class="max-w-full max-h-[80vh] object-contain">
            <button class="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition" id="mp-closePreviewBtn">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `)

      $('#mp-imagePreview').remove()

      $('body').append($imagePreview)

      $imagePreview.find('#mp-closePreviewBtn').on('click', function () {
        $imagePreview.addClass('hidden')
      })

      $imagePreview.on('click', function (e) {
        if ($(e.target).is('#mp-imagePreview')) {
          $(this).addClass('hidden')
        }
      })

      $(document).on('keydown.imagePreview', function (e) {
        if (e.key === 'Escape' && !$imagePreview.hasClass('hidden')) {
          $imagePreview.addClass('hidden')
        }
      })

      $modal.find('#closeBtn').on('click', function () {
        app.modals.close()
      })

      $modal.find('#mp-searchBtn').on('click', function () {
        searchMasterpieces()
      })

      function searchMasterpieces () {
        const username = $modal.find('#mp-username').val().trim()
        const gameType = $modal.find('#mp-gameType').val()

        if (!username) {
          app.consoleMessage({
            type: 'error',
            message: 'Please enter a username to search for masterpieces'
          })
          return
        }

        $modal.find('#mp-searchStatus').removeClass('hidden')
        $modal.find('#mp-searchResults, #mp-noResults').addClass('hidden')
        $modal.find('#mp-resultsGrid').empty()

        fetch('https://api.jam.exposed/v1/masterpiece/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username,
            game: gameType
          })
        })
          .then(async data => {
            $modal.find('#mp-searchStatus').addClass('hidden')

            const response = await data.json()
            const masterpieces = response.masterpieces || []

            if (masterpieces && Array.isArray(masterpieces) && masterpieces.length > 0) {
              $modal.find('#mp-searchResults').removeClass('hidden')

              masterpieces.forEach(masterpiece => {
                const imageUrl = typeof masterpiece === 'string' ? masterpiece : (masterpiece.imageUrl || masterpiece.thumbnailUrl)

                if (!imageUrl) {
                  console.warn('Missing image URL for masterpiece:', masterpiece)
                  return
                }

                const $item = $(`
                  <div class="masterpiece-item rounded overflow-hidden border border-sidebar-border hover:border-highlight-green transition cursor-pointer">
                    <div class="aspect-square bg-tertiary-bg relative">
                      <img src="${imageUrl}" 
                        alt="${username}'s masterpiece" 
                        class="w-full h-full object-contain"
                        data-full-image="${imageUrl}"
                        onerror="this.closest('.masterpiece-item').remove();">
                    </div>
                  </div>
                `)

                $item.on('click', function () {
                  const fullImageUrl = $(this).find('img').data('full-image')
                  if (fullImageUrl) {
                    $imagePreview.find('img').attr('src', fullImageUrl)
                    $imagePreview.removeClass('hidden')
                  }
                })

                $modal.find('#mp-resultsGrid').append($item)
              })
            } else {
              $modal.find('#mp-noResults').removeClass('hidden')
            }
          })
          .catch(() => {
            $modal.find('#mp-searchStatus').addClass('hidden')
            $modal.find('#mp-noResults').removeClass('hidden')
          })
      }

      return $modal
    },

    close: function (app) {
      $('#mp-imagePreview').remove()
      $(document).off('keydown.masterpiecesModal')
    }
  })
}
