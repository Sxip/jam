const Settings = require("../core/Settings");
const Hosts = require("../util/Hosts");

const pluginManager = core.pluginManager.instance
const settingsInstance = new Settings();
const hostsInstance = new Hosts();
var replacementCounter = 0;
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

//Thanks StackOverFlow
Array.max = function (array) {
  return Math.max.apply(Math, array);
}


//on radio switch, if you are smort, you get the idea
$(function () {
  $('input[type=radio][name=shouldUse]').change(function () {
    if (this.value == '1') {
      $('#selectPath').prop('disabled', false);
      $('#pathToClassic').prop('disabled', false);
      var input = document.getElementById("pathToClassic").value
      var flag = core.application.checkPath(input)
      if (flag) {
        $('#openClassic').prop('disabled', false);
        hostsInstance.removeAll();
      }
      else {
        $('#openClassic').prop('disabled', true);
      }
    }
    else {
      $('#selectPath').prop('disabled', true);
      $('#pathToClassic').prop('disabled', true);
      $('#openClassic').prop('disabled', true);
      settingsInstance.update("usingHosts", true)
      hostsInstance.load();
    }
  });
})
//validates path
function isValidPath() {
  var input = document.getElementById("pathToClassic").value
  if (input.trim().length > 0) {
    var flag = core.application.checkPath(input)
    if (flag) {
      $('#openClassic').prop('disabled', false);
    }
    else {
      $('#openClassic').prop('disabled', true);
    }
  }
}
//onload
async function onLoad() {
  await settingsInstance.load()
  loadContinued();
  var flag = settingsInstance.get("usingHosts");
  if (flag) {
    $('#useNoAdmin').prop('checked', false);
    $('#useHosts').prop('checked', true);
    $('#selectPath').prop('disabled', true);
    $('#pathToClassic').prop('disabled', true);
    $('#openClassic').prop('disabled', true);
    await hostsInstance.load();
  }
  else if (flag == false && (settingsInstance.get("classic_path").trim().length != 0)) {
    $('#selectPath').prop('disabled', false);
    $('#pathToClassic').prop('disabled', false);
    $('#useHosts').prop('checked', false);
    $('#useNoAdmin').prop('checked', true);
    document.getElementById("pathToClassic").value = settingsInstance.get("classic_path");
    isValidPath();
  }
}
//self explanatory
function startClassic() {
  var input = document.getElementById("pathToClassic").value
  if (input.trim().length > 0) {
    core.application.startAJC(input);
  }
}

async function loadContinued() {
  var replacementSettings = settingsInstance.get("replacements");
  if (!(jQuery.isEmptyObject(replacementSettings))) {
    var numberArr = [];
    for (var key in replacementSettings) {
      try {
        numberArr.push(parseInt(key));
        $('#replacementsContainer')
          .append(`
      <div class="card" id="replacement-${key}">
                  <div class="card-header">
                    <div class="float-right">
                      <button type="button" class="close" onclick="removeReplacement(${key})">
                        <span>&times;</span>
                      </button>   
                    </div>        
                    <h6 class="card-title mt-1">Replacement ${key}</h6>
                  </div>                
                  <div class="card-body">
                  <input class="card-text col-md-12 mb-2" id="whatToFind-${key}" onblur="addReplacementToFile(${key})" placeholder="What to find..." value="${replacementSettings[key].whatToFind}"></input>
                  <input class="card-text col-md-12" id="whatToReplace-${key}" onblur="addReplacementToFile(${key})" placeholder="What to replace with..." value="${replacementSettings[key].whatToReplace}"></input>
                  </div>
                </div>
            </div>
            `)
            var wtf = replacementSettings[key].whatToFind;
            var wtr = replacementSettings[key].whatToReplace;
            if (wtf.trim().length != 0) {
              var objectToSend = {
                number: key,
                whatToFind: wtf,
                whatToReplace: wtr
              }
              core.application.replacements.push(objectToSend);
            }
            
      }
      catch (error) {
        throw new Error(`Error Message: ${error.message}`)
      }
    }
    replacementCounter = Array.max(numberArr);
  }
}
//open file dialog to ajc
async function openFileDialog() {
  var response = await core.application.openDialog();
  if (response !== undefined) {
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
function addReplacement() {
  replacementCounter++;
  $('#replacementsContainer')
    .append(`<div class="card" id="replacement-${replacementCounter}">
              <div class="card-header">
                <div class="float-right">
                  <button type="button" class="close" onclick="removeReplacement(${replacementCounter})">
                    <span>&times;</span>
                  </button>   
                </div>        
                <h6 class="card-title mt-1">Replacement ${replacementCounter}</h6>
              </div>                
              <div class="card-body">
              <input class="form-control col-md-12 mb-2" id="whatToFind-${replacementCounter}" onblur="addReplacementToFile(${replacementCounter})" placeholder="What to find..."></input>
              <input class="form-control col-md-12" id="whatToReplace-${replacementCounter}" onblur="addReplacementToFile(${replacementCounter})" placeholder="What to replace with..."></input>
              </div>
            </div>
        </div>
`)
}
function addReplacementToFile(replacementNumber) {
  try {
    var wtf = document.getElementById(`whatToFind-${replacementNumber}`).value;
    var wtr = document.getElementById(`whatToReplace-${replacementNumber}`).value;
    if (wtf.trim().length != 0) {
      var objectToSend = {
        number: replacementNumber,
        whatToFind: wtf,
        whatToReplace: wtr
      }
      core.application.addToReplacements(replacementNumber, objectToSend);
    }
  }
  catch (error) {
    throw new Error(`Failed to add replacement ${replacementNumber} to file, Error Message: ${error.message}`)
  }

}
function removeReplacement(value) {
  try {
    core.application.removeReplacements(value);
  }
  catch (error) {
    throw new Error(`Failed to remove replacement ${value}, Error Message: ${error.message}`)
  }
  $('#replacement-' + value).remove();
}