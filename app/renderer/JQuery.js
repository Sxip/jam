const Settings = require("../core/Settings");
const Hosts = require("../util/Hosts");

const pluginManager = core.pluginManager.instance
const settingsInstance = new Settings();
const hostsInstance = new Hosts();
/**
 * Handles plugins
 */
$(function () {
  $('#pluginsModal').on('show.bs.modal', () => {
    if (pluginManager.plugins.size <= 0) {
      return $('#pluginContainer')
        .html('<div class="text-center">The plugin directory is empty</div>')
    }

    Array.from(pluginManager.plugins.values())
      .sort(plugin => {
        if (plugin.config.type === 'window') return 0
        return 1
      })
      .forEach(plugin => {
        $('#pluginContainer')
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

  $('#pluginsModal').on('hide.bs.modal', () => $('#pluginContainer').empty())
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

//on radio switch, if you are smort, you get the idea
$(function () {
  $('input[type=radio][name=shouldUse]').change(function() {
    if (this.value == '1') {
      $('#selectPath').prop('disabled', false);
      $('#pathToClassic').prop('disabled', false);
      var input = document.getElementById("pathToClassic").value
      var flag = core.application.checkPath(input)
      if(flag){
        $('#openClassic').prop('disabled', false);
        hostsInstance.removeAll();
      }
      else{
        $('#openClassic').prop('disabled', true);
      }
    }
    else {
      $('#selectPath').prop('disabled', true);
      $('#pathToClassic').prop('disabled', true);
      $('#openClassic').prop('disabled', true);
     settingsInstance.update("usingHosts",true)
     hostsInstance.load();
    }
});
})
//validates path
function isValidPath(){
  var input = document.getElementById("pathToClassic").value
  if(input.trim().length > 0){
    var flag = core.application.checkPath(input)
    if(flag){
      $('#openClassic').prop('disabled', false);
    }
    else{
      $('#openClassic').prop('disabled', true);
    }
  }
}
//onload
async function onLoad(){
await settingsInstance.load()
var flag = settingsInstance.get("usingHosts");
if(flag){
  $('#useNoAdmin').prop('checked', false);
  $('#useHosts').prop('checked', true);
  $('#selectPath').prop('disabled', true);
  $('#pathToClassic').prop('disabled', true);
  $('#openClassic').prop('disabled', true);
  await hostsInstance.load();
}
else if(flag == false && (settingsInstance.get("classic_path").trim().length != 0)){
  $('#selectPath').prop('disabled', false);
  $('#pathToClassic').prop('disabled', false);
  $('#useHosts').prop('checked', false);
  $('#useNoAdmin').prop('checked', true);
  document.getElementById("pathToClassic").value = settingsInstance.get("classic_path");
  isValidPath();
}
}
//self explanatory
function startClassic(){
  var input = document.getElementById("pathToClassic").value
  if(input.trim().length > 0){
   core.application.startAJC(input);
  }
}
//open file dialog to ajc
 async function openFileDialog(){
    var response = await core.application.openDialog(); 
    if(response !== undefined){
      document.getElementById("pathToClassic").value = response;
      isValidPath();
    }    
  }
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
