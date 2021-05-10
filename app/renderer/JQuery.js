const pluginManager = core.pluginManager.instance

/**
 * Handles plugins
 */
$(function () {
  $('#pluginsModal').on('show.bs.modal', () => {
    if (pluginManager.plugins.size <= 0) {
      return $('.plugin-container')
        .html('<div class="text-center">The plugin directory is empty</div>')
    }

    Array.from(pluginManager.plugins.values())
      .sort(plugin => {
        if (plugin.config.type === 'window') return 0
        return 1
      })
      .forEach(plugin => {
        $('.plugin-container')
          .append(`
          <div class="card">
            <div class="card-body">
            <h6 class="card-title">${plugin.config.name}</h6>
            <p class="card-subtitle mb-2 text-muted">By ${plugin.config.author}</p>
            <p class="card-text">${plugin.config.description}</p>

            <div class="float-right">
              <button class="btn" style="font-size: 12px;"
                onClick="pluginManager.reload('${plugin.config.name}')">
                <span class="far fa-fw fa-sync-alt" aria-hidden="true"></span>
                Reload
              </button>

              <button class="btn" style="font-size: 12px;" 
                onClick="core.pluginManager.instance.directory('${plugin.config.name}')">
                <span class="fal fa-fw fa-folder"></span> Directory
              </button>
              
              <button class="btn" style="font-size: 12px; ${plugin.config.type === 'window' ? '' : 'display: none'}" 
                onClick="pluginManager.open('${plugin.config.name}')">
                <span class="far fa-fw fa-external-link"></span> View
              </button>
            </div>
          </div>
        `)
      })
  })

  $('#pluginsModal').on('hide.bs.modal', () => $('.plugin-container').empty())
})

/**
 * Plugin search
 */
$(function () {
  $('#search').on('keyup', function () {
    const value = this.value.toLowerCase().trim()
    $('div.card').show().filter(function () {
      return $(this).text().toLowerCase().trim().indexOf(value) === -1
    }).hide()
  })
})

/**
 * Auto complete
 */
core.application.on('ready', () => {
  $(function () {
    $('#input').autocomplete({
      source: Array.from(core.pluginManager.commands.commands.values())
        .map(command => ({ value: command.name, item: command.description })),
      position: { collision: 'flip' }
    }).data('ui-autocomplete')._renderItem = function (ul, item) {
      return $('<li>')
        .data('ui-autocomplete-item', item)
        .append(`<a>${item.value}</a> <a class="float-right description">${item.item}</a>`)
        .appendTo(ul)
    }
  })
})
