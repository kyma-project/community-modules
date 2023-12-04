import { apply, get, resPath, deleteResource, patchResource } from './k8s.js'
import "@ui5/webcomponents/dist/Button.js";

var API_PREFIX = ''
const DEFAULT_CHANNEL = 'https://kyma-project.github.io/community-modules/latest.json'
const CHANNELS = [
  { name: 'regular', url: 'https://kyma-project.github.io/community-modules/regular.json' },
  { name: 'fast', url: 'https://kyma-project.github.io/community-modules/fast.json' },
  { name: 'latest', url: 'https://kyma-project.github.io/community-modules/latest.json' }
]
const KYMA_PATH = '/apis/operator.kyma-project.io/v1beta2/namespaces/kyma-system/kymas/default'

var modules = []

function channelDropdown() {
  const url = new URL(window.location);
  let channel = url.searchParams.get("channel") || DEFAULT_CHANNEL
  API_PREFIX = url.searchParams.get("api") || ''
  let currentChannel = CHANNELS.find((ch) => ch.url == channel)
  let channelName = channel
  if (currentChannel) {
    channelName = currentChannel.name
  }
  let div = document.getElementById("topButtons")
  div.innerHTML = ""
  let a = document.createElement('a')
  a.setAttribute('class', 'btn btn-secondary dropdown-toggle btn-sm')
  a.setAttribute('role', 'button')
  a.setAttribute('data-bs-toggle', 'dropdown')
  a.setAttribute('aria-expanded', 'false')
  a.textContent = channelName
  let ul = document.createElement('a')
  ul.setAttribute('class', 'dropdown-menu')
  for (let ch of CHANNELS) {
    if (ch.url != channel) {
      let li = document.createElement('li')
      let a = document.createElement('a')
      a.setAttribute('class', 'dropdown-item')
      a.textContent = ch.name
      a.addEventListener('click', () => {
        const url = new URL(window.location);
        url.searchParams.set("channel", ch.url);
        window.location = url
      })
      li.appendChild(a)
      ul.appendChild(li)
    }
  }
  let updateBtn = document.createElement('ui5-button')
  // updateBtn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  // updateBtn.setAttribute('type', 'button')
  updateBtn.textContent = 'Update status'
  updateBtn.addEventListener('click', checkStatus)

  div.appendChild(a)
  div.appendChild(ul)
  div.appendChild(updateBtn)

  if (API_PREFIX != '') {
    let busolaBtn = document.createElement('ui5-button')
    // busolaBtn.setAttribute('class', 'btn btn-outline-primary btn-sm')
    // busolaBtn.setAttribute('type', 'button')
    busolaBtn.textContent = 'Kyma Dashboard'
    busolaBtn.addEventListener('click', openBusola)
    div.appendChild(busolaBtn)
  }

  return div
}

async function applyModule(m) {
  for (let r of m.resources) {
    await apply(r.resource)
  }
  await apply(m.cr.resource)
}

function openBusola() {
  localStorage.setItem('busola.clusters', '{"kyma":{"name":"kyma","kubeconfig":{"apiVersion":"v1","clusters":[{"cluster":{"server":"http://127.0.0.1:8001/backend"},"name":"kyma"}],"contexts":[{"context":{"cluster":"kyma","user":"admin"},"name":"kyma"}],"current-context":"kyma","kind":"Config","preferences":{},"users":[{"name":"admin","user":{"token":"tokentokentoken"}}]},"contextName":"kyma","config":{"storage":"localStorage"},"currentContext":{"cluster":{"cluster":{"server":"http://127.0.0.1:8001/backend"},"name":"kyma"},"user":{"name":"admin","user":{"token":"tokentokentoken"}}}}}')
  window.open('/index.html', '_blank')
}


function deleteModuleResources(m) {
  for (let r of m.resources) {
    if (r.path == '/api/v1/namespaces/kyma-system') {
      continue; // skip kyma-system deletion
    }
    deleteResource(r.path)
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
async function addModuleToKymaCR(name) {
  let kyma = await get(KYMA_PATH)
  if (kyma && kyma.spec.modules) {
    let body = `[{"op":"add","path":"/spec/modules/-","value":{"name":"${name}"}}]`
    patchResource(KYMA_PATH, body)
    return
  }
}

async function deleteModule(m) {
  let toDelete = await managedResourcesList(m)
  let body = `Do you want to delete module ${m.name}?`
  if (toDelete.length > 0) {
    body = "Can't delete module, because of these managed resources:<br>" + toDelete.join('<br/>')
      + '</br>Do you want to delete them first?'
    modal(body, "Delete confirmation", async () => {
      for (let i = 0; i < 5 && toDelete.length > 0; ++i) {
        for (let p of toDelete) {
          deleteResource(p)
        }
        toDelete = await managedResourcesList(m)
        setTimeout(() => checkStatus(), 1000)
        await new Promise(r => setTimeout(r, 1000));

      }
      if (toDelete.length > 0) {
        deleteModule(m)
      } else {
        deleteModuleResources(m)
        setTimeout(() => checkStatus(), 3000)
      }
    })
    return
  }
  modal("The module operator will be undeployed. Do you want to continue?", "Delete confirmation",
    () => {
      deleteModuleResources(m)
      setTimeout(() => checkStatus(), 3000)
    })
}

function modal(html, title, callback) {
  document.getElementById("modal-body").innerHTML = html
  document.getElementById("modalTitle").textContent = title
  let modalOk = document.getElementById("modalOk")
  let okBtn = modalOk.cloneNode(true)
  modalOk.replaceWith(okBtn)
  okBtn.addEventListener('click', () => {
    callback()
    myModal.toggle()
  })
  var myModal = new bootstrap.Modal(document.getElementById('exampleModal'));
  myModal.toggle()
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
        let path = await resPath(i)
        list.push(path)
      }
    }
  }
  return list.sort()
}

function deploymentList(m) {
  let div = document.createElement("div")
  if (m.details) {
    let html = '<ul class="list-group">'
    for (let r of m.resources) {
      let badge = `<span class="badge bg-secondary"> - </span>`
      if (r.status === true) {
        badge = `<span class="badge bg-success">applied</span>`
        html += `<li class="list-group-item"><small>
        <a href="${API_PREFIX + r.path}" class="text-decoration-none" target="_blank">
          ${r.resource.kind}: ${r.resource.metadata.name}</a> ${badge}</small></li>`
      } else {
        html += `<li class="list-group-item"><small>${r.resource.kind}: ${r.resource.metadata.name}</a> ${badge}</small></li>`
      }
    }
    div.innerHTML = html + '</ul>'
  }
  return div
}
function resourcesBadge(m) {
  let applied = 0
  m.resources.forEach(r => applied += (r.status) ? 1 : 0)
  let color = (applied == m.resources.length) ? 'bg-success' : 'bg-secondary'
  return `<span class="badge ${color}">${applied} / ${m.resources.length}</span>`
}

function crBadge(m) {
  if (m.cr.status) {
    if (m.cr.value && m.cr.value.status && m.cr.value.status.state == "Ready") {
      return `<span class="badge bg-success">Ready</span>`
    }
    if (m.cr.value && m.cr.value.status && m.cr.value.status.state) {
      return `<span class="badge bg-warning text-dark">${m.cr.value.status.state}</span>`
    }
    return `<span class="badge bg-warning text-dark">applied</span>`
  }
  return `<span class="badge bg-secondary"> - </span>`
}

function moduleBadge(m) {
  if (m.managed) {
    return `<span class="badge text-bg-dark">managed</span>`
  }
  if (m.community) {
    return `<span class="badge bg-info text-dark">community</span>`
  }
  return ''
}
function applyBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "apply"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.disabled = m.managed || !m.deploymentYaml
  btn.addEventListener("click", function (event) {
    if (m.manageable) {
      modal("This module can be managed by Kyma Control Plane. "
        + "If you continue it will be applied as an open source (community) module "
        + "and will not be automatically upgraded. Do you want to continue?",
        "Opt out from managed version", () => {
          applyModule(m)
          setTimeout(() => checkStatus(), 3000)
        })
    } else {
      applyModule(m)
      setTimeout(() => checkStatus(), 3000)
    }
  })
  return btn
}
function addBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "add"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.disabled = m.managed || !m.manageable
  btn.addEventListener("click", function (event) {
    addModuleToKymaCR(m.name)
    setTimeout(() => checkStatus(), 3000)
  })
  return btn
}

function detailsBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = (m.details) ? "hide details" : "details"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", function () {
    m.details = !m.details
    renderModules()
  })
  return btn
}
function removeBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "remove"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.disabled = !m.managed
  btn.addEventListener("click", function () {
    if (m.managed) {
      modal("This is a managed module. Do you want to remove it from SKR managed resources?", "Remove module from Kyma CR", async () => {
        removeModuleFromKymaCR(m.name)
      })
      return
    }
  
  })
  return btn
}

function deleteBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "delete"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.disabled=m.managed
  btn.addEventListener("click", function () {
    deleteModule(m)
  })
  return btn
}
function externalLink(href, name) {
  if (href) {
    return `<a href="${href}" class="text-decoration-none" target="_blank">
      ${name} <i class="bi bi-box-arrow-up-right"></i></a>`
  }
  return ""
}
function configLink(m) {
  if (m.cr.status) {
    return `<a href="${API_PREFIX + m.cr.path}" class="text-decoration-none" target="_blank">
      configuration </i></a>`
  }
  return "configuration"
}

function moduleCard(m) {
  let managedButtons = document.createElement("div")
  managedButtons.setAttribute('class', 'd-inline-flex gap-1')
  let buttons = document.createElement("div")
  buttons.setAttribute('class', 'd-inline-flex gap-1')
  managedButtons.appendChild(addBtn(m))
  managedButtons.appendChild(removeBtn(m))
  buttons.appendChild(applyBtn(m))
  buttons.appendChild(deleteBtn(m))
  buttons.appendChild(detailsBtn(m))
  let col = document.createElement('div')
  col.setAttribute('class', 'col mb-3')
  let card = document.createElement("div")
  card.setAttribute('class', 'card h-100')
  let cardBody = document.createElement('div')
  cardBody.setAttribute('class', 'card-body')
  let txt = document.createElement("div")
  let version = "-"
  if (m.deploymentVersion) {
    version = m.deploymentVersion.split('/')[m.deploymentVersion.split('/').length - 1]
  }
  let html = `<h5>${m.name} ${moduleBadge(m)}</h5>
  <small>
    module version: ${m.version} <br/>
    deployment: ${resourcesBadge(m)} <br/>
    ${version} ${versionBadge(m)} ${availableBadge(m)} <br/>
    ${configLink(m)} ${crBadge(m)}<br/>
    ${externalLink(m.documentation, "docs")}
    ${externalLink(m.repository, "repo")}
    <br/>
    </small>`
  txt.innerHTML = html
  cardBody.appendChild(txt)
  if (m.manageable) {
    cardBody.appendChild(managedButtons)
    cardBody.appendChild(document.createElement('p'))  
  }
  cardBody.appendChild(buttons)
  cardBody.appendChild(deploymentList(m))
  card.appendChild(cardBody)
  card.setAttribute('id', 'module-' + m.name)
  col.appendChild(card)
  return col
}

function renderModules(m) {
  if (m) {
    let mDiv = document.getElementById('module-' + m.name)
    if (mDiv) {
      mDiv.parentNode.replaceChild(moduleCard(m), mDiv)
    }
  } else {
    let div = document.getElementById('content');
    div.innerHTML = ""
    for (let m of modules) {
      div.appendChild(moduleCard(m))
    }
  }
}
function versionBadge(m) {
  if (m.deploymentVersion == m.actualVersion) {
    return `<span class="badge bg-success">ok</span>`
  } else if (m.actualVersion) {
    let v = m.actualVersion.split(':')[m.actualVersion.split(':').length - 1]
    return `<span class="badge bg-warning text-dark">applied: ${v}</span>`
  }
  return ""
}
function availableBadge(m) {
  if (m.available) {
    return `<span class="badge bg-success">Ready</span>`
  } else if (m.actualVersion) {
    return `<span class="badge bg-secondary">Not Ready</span>`
  }
  return ""
}
async function managedModules() {
  let kyma = await get(KYMA_PATH)
  if (kyma) {
    for (let m of modules) {
      if (kyma.spec.modules) {
        let mm = kyma.spec.modules.find((mod) => mod.name == m.name)
        m.managed = (mm) ? true : false
      }
    }
  } else {
    for (let m of modules) {
      m.manageable = false
    }
  }
}

async function loadChannel() {
  const url = new URL(window.location);
  let channel = url.searchParams.get("channel") || DEFAULT_CHANNEL
  let res = await fetch(channel)
  let json = await res.json()
  modules = json
  for (let m of modules) {
    let crPath = await resPath(m.cr.resource)
    m.cr.path = crPath

    for (let i of m.resources) {
      let path = await resPath(i.resource)
      i.path = path
    }
  }
  renderModules()
  checkStatus()
}

function checkStatus() {
  managedModules()
  for (let m of modules) {
    resPath(m.cr.resource).then((p) => {
      m.cr.path = p
      console.log('Module', m.name, 'CR path', p)
      return (p) ? get(p) : null
    }).then((body) => {
      m.cr.value = body
      m.cr.status = (body) ? true : false
      renderModules(m)
    })

    for (let r of m.resources) {
      m.available = false
      m.actualVersion = undefined
      if (r.path) {
        get(r.path).then((json) => {
          if (!json) {
            r.status = false
          } else {
            r.status = true
          }
          r.value = json
          if (json && json.kind == 'Deployment') {
            if (json.spec.template.spec.containers.length == 1) {
              m.actualVersion = json.spec.template.spec.containers[0].image
            } else {
              for (let c of json.spec.template.spec.containers) {
                if (!c.image.indexOf('proxy') >= 0) {
                  m.actualVersion = c.image
                }
              }
            }
            if (json.status && json.status.conditions) {
              let av = json.status.conditions.find(c => c.type == 'Available')
              if (av && av.status == "True") {
                m.available = true
              }
            }
          }
        }).then(() => {renderModules(m)}  ) 
      }
    }
  }
}
function navbar() {
  console.log('NAVBAR')
  let navItems = [
    { name: "Modules", hash: "#modules" },
    // {name:"Services",hash:"#services"},
  ]
  let nav = document.getElementById('navigation')
  nav.innerHTML = ""
  let hash = window.location.hash
  for (let i of navItems) {
    let active = (hash == i.hash) ? 'active' : ''
    let li = document.createElement('li')
    li.setAttribute('class', 'nav-item')
    let a = document.createElement('a')
    a.setAttribute('class', `nav-link ${active}`)
    a.href = i.hash
    a.textContent = i.name

    li.appendChild(a)
    nav.appendChild(li)
  }
}

function render() {
  console.log('render')
  navbar()
  let hash = window.location.hash
  channelDropdown()
  loadChannel()
}

const registerBrowserBackAndForth = () => {
  window.onpopstate = function (e) {
    console.log('onpopstate')
    render()
  };
};

registerBrowserBackAndForth()
render()
