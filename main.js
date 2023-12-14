import '@ui5/webcomponents/dist/Button';
import '@ui5/webcomponents/dist/Table';
import '@ui5/webcomponents/dist/TableColumn';
import '@ui5/webcomponents/dist/TableRow';
import '@ui5/webcomponents/dist/TableCell';
import '@ui5/webcomponents/dist/Card';
import '@ui5/webcomponents/dist/CardHeader';
import '@ui5/webcomponents/dist/ResponsivePopover.js';
import '@ui5/webcomponents/dist/Badge.js';
import '@ui5/webcomponents/dist/Select.js';
import '@ui5/webcomponents/dist/Option.js';
import '@ui5/webcomponents/dist/Icon.js';
import '@ui5/webcomponents/dist/Link.js';

import "@ui5/webcomponents-icons/dist/delete.js";
import "@ui5/webcomponents-icons/dist/refresh.js";
import "@ui5/webcomponents-icons/dist/settings.js";
import "@ui5/webcomponents-icons/dist/add-product.js";
import "@ui5/webcomponents-icons/dist/chain-link.js";
import { get, deleteResource, apply, patchResource } from "./k8s.js";
import modules from "./model.js";
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import yamlWorker from 'monaco-yaml/yaml.worker?worker';
import * as jsYaml from 'js-yaml'

self.MonacoEnvironment = {
  getWorker: function (workerId, label) {
    switch (label) {
      case 'yaml':
        return yamlWorker();
      default:
        return editorWorker();
    }
  }
};


const KYMA_PATH = '/apis/operator.kyma-project.io/v1beta2/namespaces/kyma-system/kymas/default'

async function installedManagers(modules) {
  let paths = {}
  for (let m of modules) {
    for (let v of m.versions) {
      paths[v.managerPath] = get(v.managerPath)
      paths[v.crPath] = get(v.crPath)
    }
  }
  await Promise.allSettled(Object.values(paths))
  for (let m of modules) {
    m.available = false
    m.managerImage = undefined
    m.actualVersion = undefined
    for (let v of m.versions) {
      let cr = await paths[v.crPath]
      if (cr) {
        m.config = cr
      }

      let manager = await paths[v.managerPath]
      if (manager && manager.kind == 'Deployment') {
        if (manager.spec.template.spec.containers.length == 1) {
          m.managerImage = manager.spec.template.spec.containers[0].image
        } else {
          for (let c of manager.spec.template.spec.containers) {
            if (!c.image.indexOf('proxy') >= 0) {
              m.managerImage = c.image
            }
          }
        }
        if (m.managerImage == v.managerImage) {
          m.actualVersion = v.version
        }
        if (manager.status && manager.status.conditions) {
          let av = manager.status.conditions.find(c => c.type == 'Available')
          if (av && av.status == "True") {
            m.available = true
          }
        }
      }
    }
  }
  return modules
}

function render(modules) {
  let app = document.querySelector('#app');
  app.innerHTML = ""

  app.appendChild(refreshBtn())

  let managed = modules.filter(m => m.managed)
  if (managed.length > 0) {
    app.appendChild(modulesCard(managedModulesTable(managed), 'Managed Modules',
    'Modules managed by the Kyma Control Plane (auto-update with the release channel)'))
  }

  let installed = modules.filter(m => m.actualVersion && !m.managed)
  if (installed.length > 0) {
    app.appendChild(
      modulesCard(installedModulesTable(installed), 'User Modules',
        'Modules installed by the user (no auto-update)'))
  
  }

  app.appendChild(modulesCard(availableModulesTable(modules), 'Available Modules',
    'List of all modules available for installation'))
}

async function managedModules(modules) {
  let kyma = await get(KYMA_PATH)
  if (kyma) {
    for (let m of modules) {
      if (kyma.spec.modules) {
        let mm = kyma.spec.modules.find((mod) => mod.name == m.name)
        if (mm) {
          m.managed = true
          m.channel = mm.channel || kyma.spec.channel
        } else {
          m.managed = false
          m.channel = undefined
        }
      }
    }
  } else {
    for (let m of modules) {
      m.manageable = false
    }
  }
  return modules
}


async function managedResourcesList(m) {
  let list = []
  if (!m.managedResources) {
    return list
  }
  for (let mr of m.managedResources) {
    let res = await get(mr)
    if (res && res.items) {
      for (let i of res.items) {
        list.push(i)
      }
    }
  }
  return list.sort()
}
async function applyModuleResources(m, version) {
  let res = await fetchModuleResources(m, version)
  for (let r of res) {
    await apply(r)
  }
}
async function deleteModuleResources(m) {
  let res = await fetchModuleResources(m)
  for (let r of res) {
    if (r.kind == 'Namespace' && r.metadata.name == 'kyma-system') {
      continue; // skip kyma-system deletion
    }
    deleteResource(r)
  }
}

async function addModuleToKymaCR(name, defaultConfig, channel) {
  let kyma = await get(KYMA_PATH)
  if (kyma && kyma.spec.modules) {
    let index = kyma.spec.modules.findIndex((m) => m.name == name)

    let policy = (defaultConfig) ? 'CreateAndDelete' : 'Ignore'
    let body = `[{"op":"add","path":"/spec/modules/-","value":{"name":"${name}","customResourcePolicy":"${policy}","channel":"${channel}"}}]`
    if (index >= 0) {
      body = `[{"op":"replace","path":"/spec/modules/${index}", "value":{"name":"${name}","customResourcePolicy":"${policy}","channel":"${channel}"}}]`
    }
    patchResource(KYMA_PATH, body)
    return
  }
}

async function removeModuleFromKymaCR(name) {
  let kyma = await get(KYMA_PATH)
  if (kyma && kyma.spec.modules) {
    for (let i = 0; i < kyma.spec.modules.length; ++i) {
      if (kyma.spec.modules[i].name == name) {
        let body = `[{"op":"remove","path":"/spec/modules/${i}"}]`
        patchResource(KYMA_PATH, body)
        return
      }
    }
  }
}

async function fetchModuleResources(m, version) {
  let v = version || m.actualVersion
  return m.versions.find(ver => ver.version == v).resources

}
async function deleteModule(m, btn) {
  const mr = await managedResourcesList(m)
  if (mr.length > 0) {
    let list = ""
    for (let r of mr) {
      list += `<li>${r.kind}: ${r.metadata.namespace ? r.metadata.namespace + '/' : ''}${r.metadata.name} </li>`
    }
    const p = document.createElement('p')
    p.innerHTML = 'This module has managed resources. Do you want to remove them as well?<ul>' + list + '</ul>'

    popover('Remove Module', p, btn, "Remove", () => {
      for (let r of mr) {
        console.log('removing', r)
        deleteResource(r)
      }
      if (m.managed) {
        removeModuleFromKymaCR(m.name)
      }  
      setTimeout(() => { deleteModule(m, btn) }, 5000)
    })
  } else {
    if (m.managed) {
      removeModuleFromKymaCR(m.name)
    } else {
      await deleteModuleResources(m)
    }

  }
}

function configureBtn(m) {

  const btn = document.createElement('ui5-button')
  btn.setAttribute('icon', 'settings')
  btn.setAttribute('tooltip', 'Configure ' + m.name)
  if (m.config) {
    if (m.config.status && m.config.status.state && m.config.status.state != 'Ready') {
      console.log('warning', m.name, m.config.status.state)
      btn.setAttribute('design', 'Attention')
    }
  } else {
    btn.setAttribute('design', 'Attention')
  }


  btn.addEventListener('click', async () => {
    const div = document.createElement('div')
    div.setAttribute('class', 'code')
    popover(m.name + ' Configuration', div, btn, "Close", async () => {})
    let code  = jsYaml.dump(m.config)
    setTimeout(() => {
      monaco.editor.create(div, {
      value: code,
      language: 'yaml'
    });},0)
  
  })
  return btn
}

function refreshBtn() {
  const btn = document.createElement('ui5-button')
  btn.setAttribute('icon', 'refresh')
  btn.textContent = 'Refresh'
  btn.addEventListener('click', () => {
    installedManagers(modules).then(managedModules).then(render)
  })
  return btn
}

function removeBtn(m) {
  const btn = document.createElement('ui5-button')
  btn.setAttribute('icon', 'delete')
  btn.addEventListener('click', () => {
    console.log('remove', m)
    deleteModule(m, btn)
  })
  return btn
}

function modulesCard(content, title, subtitle) {
  const card = document.createElement('ui5-card')
  const header = document.createElement('ui5-card-header')
  header.setAttribute('slot', 'header')
  header.setAttribute('title-text', title)
  header.setAttribute('subtitle-text', subtitle)
  card.appendChild(header)
  card.appendChild(content)
  return card
}

function dropdownSelector(id, label, options) {
  let div = document.createElement('div')
  let labelElement = document.createElement('ui5-label')
  labelElement.textContent = label
  let select = document.createElement('ui5-select')
  select.setAttribute('id', id)
  labelElement.setAttribute('for', id)
  let selected = false
  for (let o of options) {
    let item = document.createElement('ui5-option')
    if (typeof o === 'object') {
      item.textContent = o.label
      item.setAttribute('value', o.value)
    } else {
      item.textContent = o
      item.setAttribute('value', o)
    }
    if (!selected) {
      item.setAttribute('selected', 'true')
      selected = true
    }
    select.appendChild(item)
  }
  div.appendChild(labelElement)
  div.appendChild(select)
  div.getSelectedOption = () => {
    return select.selectedOption.value
  }
  return div
}

function channelList(m) {
  const list = []
  for (let v of m.versions) {
    if (v.channels) {
      for (let c of v.channels) {
        list.push({ label: `${c} (${v.version})`, value: c })

      }
    }
  }
  return list
}

function installPanel(m) {
  const div = document.createElement('div')
  div.setAttribute('style', 'display: flex; flex-direction: column; gap: 1rem')
  const managed = document.createElement('ui5-checkbox')
  managed.setAttribute('text', 'add as managed module (auto-update with the release channel)')
  managed.setAttribute('id', 'managedCheckbox')
  const version = dropdownSelector(m.name + '-version', 'Version', m.versions.map(v => v.version).reverse())
  const channel = dropdownSelector(m.name + '-channel', 'Channel', channelList(m))
  managed.addEventListener('change', () => {
    if (managed.checked) {
      channel.setAttribute('style', 'display: block')
      version.setAttribute('style', 'display: none')
    } else {
      channel.setAttribute('style', 'display: none')
      version.setAttribute('style', 'display: block')
    }
  })
  if (m.manageable) {
    managed.setAttribute('checked', 'true')
    version.setAttribute('style', 'display: none')
  } else {
    managed.setAttribute('disabled', 'true')
    channel.setAttribute('style', 'display: none')
  }
  div.appendChild(managed)
  div.appendChild(version)
  div.appendChild(channel)
  const defaultConfig = document.createElement('ui5-checkbox')
  defaultConfig.setAttribute('text', 'apply default configuration')
  defaultConfig.setAttribute('checked', 'true')
  defaultConfig.setAttribute('id', 'defaultConfigCheckbox')
  div.appendChild(defaultConfig)
  div.getVersion = () => {
    return version.getSelectedOption()
  }
  div.getChannel = () => {
    return channel.getSelectedOption()
  }
  return div
}

function installBtn(m) {
  const btn = document.createElement('ui5-button')
  btn.setAttribute('icon', 'add-product')
  let options = installPanel(m)
  btn.addEventListener('click', () => {
    const pop = popover(`Add ${m.name}`, options, btn, "Install", async () => {
      if (options.querySelector('#managedCheckbox').checked) {
        console.log('adding', m.name, options.getChannel())
        addModuleToKymaCR(m.name, options.querySelector('#defaultConfigCheckbox').checked, options.getChannel())

      } else {
        let v = m.versions.find(v => v.version == options.getVersion())
        if (v) {
          console.log('installing', m.name, v.version)
          await applyModuleResources(m, v.version)
          if (options.querySelector('#defaultConfigCheckbox').checked) {
            console.log('applying default config for', m.name, v.cr)
            await apply(v.cr)
          }
        }

      }
    })
  })
  return btn
}

function availableModulesTable(modules) {
  const columns = `<ui5-table-column slot="columns">name</ui5-table-column>
  <ui5-table-column slot="columns">versions</ui5-table-column>
  <ui5-table-column slot="columns"></ui5-table-column>`
  const table = document.createElement('ui5-table')
  table.innerHTML = columns
  for (const m of modules) {
    const row = document.createElement('ui5-table-row')
    const nameCell = document.createElement('ui5-table-cell')
    nameCell.innerHTML = externalLinkHtml(m.documentation, m.name)
    row.appendChild(nameCell)
    const versionsCell = document.createElement('ui5-table-cell')
    versionsCell.textContent = m.versions.map(v => {
      return v.channels ? v.version + ' (' + v.channels.join(', ') + ')' : v.version
    }).join(', ')
    row.appendChild(versionsCell)
    const actions = document.createElement('ui5-table-cell')
    actions.setAttribute('style', 'text-align: right')
    actions.appendChild(installBtn(m))
    row.appendChild(actions)
    table.appendChild(row)
  }
  return table
}
function deploymentBadge(m) {
  if (m.available) {
    return `<ui5-badge color-scheme="8">Ready</ui5-badge>`
  } else {
    return `<ui5-badge color-scheme="1">Not Ready</ui5-badge>`
  }

}

function managedModulesTable(modules) {
  const columns = `<ui5-table-column slot="columns">name</ui5-table-column>
  <ui5-table-column slot="columns">channel</ui5-table-column>
  <ui5-table-column slot="columns">version</ui5-table-column>
  <ui5-table-column slot="columns">manager</ui5-table-column>
  <ui5-table-column slot="columns"></ui5-table-column>`
  const table = document.createElement('ui5-table')
  table.innerHTML = columns
  for (const m of modules) {
    let image = m.managerImage ? m.managerImage.split('/')[m.managerImage.split('/').length - 1] : ''
    const row = document.createElement('ui5-table-row')
    row.innerHTML = `<ui5-table-cell>${externalLinkHtml(m.documentation, m.name)}</ui5-table-cell>
    <ui5-table-cell>${m.channel}</ui5-table-cell>
    <ui5-table-cell>${m.actualVersion}</ui5-table-cell>
    <ui5-table-cell>${deploymentBadge(m)} ${image}</ui5-table-cell>`

    const actions = document.createElement('ui5-table-cell')
    actions.setAttribute('style', 'text-align: right')
    actions.appendChild(configureBtn(m))
    actions.appendChild(removeBtn(m))
    row.appendChild(actions)

    table.appendChild(row)
  }
  return table
}
function notManagedWarning(m) {
  if (m.actualVersion && m.manageable && !m.managed) {
    return `<ui5-badge color-scheme="1">Not Managed</ui5-badge>`
  }
  return ''
}

function externalLinkHtml(href, name) {
  if (href) {
    return `<ui5-link href="${href}" target="_blank">${name}</ui5-link>`
  }
  return name
}

function externalLink(href, name) {
  if (href) {
    return `<ui5-link href="${href}" target="_blank">${name} <ui5-icon name="sap-icon://chain-link"></ui5-icon></ui5-link>`
  }
  return null
}


function installedModulesTable(modules) {
  const columns = `<ui5-table-column slot="columns">name</ui5-table-column>
  <ui5-table-column slot="columns">version</ui5-table-column>
  <ui5-table-column slot="columns">manager</ui5-table-column>
  <ui5-table-column slot="columns"></ui5-table-column>`
  const table = document.createElement('ui5-table')
  table.innerHTML = columns
  for (const m of modules) {
    let image = m.managerImage.split('/')[m.managerImage.split('/').length - 1]
    const row = document.createElement('ui5-table-row')
    row.innerHTML = `<ui5-table-cell>${externalLinkHtml(m.documentation, m.name)} ${notManagedWarning(m)}</ui5-table-cell>
    <ui5-table-cell>${m.actualVersion}</ui5-table-cell>
    <ui5-table-cell>${deploymentBadge(m)} ${image}</ui5-table-cell>`

    const actions = document.createElement('ui5-table-cell')
    actions.setAttribute('style', 'text-align: right')
    actions.appendChild(configureBtn(m))
    actions.appendChild(removeBtn(m))
    row.appendChild(actions)
    table.appendChild(row)
  }
  return table
}

/**
 * 
 * @param {string} title 
 * @param {Node} content 
 * @param {Node} anchor DOM node to which the popover is attached
 * @param {string} btnText 
 * @param {function} onClick function to be called when the button is clicked
 * @returns 
 */
function popover(title, content, anchor, btnText, onClick) {
  const overlay = document.querySelector('#overlay')
  overlay.innerHTML = ""

  const popover = document.createElement('ui5-responsive-popover')
  popover.setAttribute('header-text', title)
  popover.setAttribute('media-range', 'S')
  popover.appendChild(content)
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'footer')
  footer.setAttribute('style', 'display: flex; justify-content: flex-end; width: 100%; align-items: center')
  const btn = document.createElement('ui5-button')
  btn.textContent = btnText
  btn.addEventListener("click", () => {
    popover.close()
    onClick()
  });
  footer.appendChild(btn)
  popover.appendChild(footer)
  overlay.appendChild(popover)
  setTimeout(() => popover.showAt(anchor), 0)
  return popover
}

installedManagers(modules).then(managedModules).then(render)
