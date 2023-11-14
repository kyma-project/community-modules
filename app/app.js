var pods = []
var groupVersions = {}
const DEFAULT_CHANNEL='https://kyma-project.github.io/community-modules/latest.json'
var modules = []

async function apply(res) {
  let path = await resPath(res)
  path += '?fieldManager=kubectl&fieldValidation=Strict&force=false'
  let response = await fetch(path, { method: 'PATCH', headers: { 'content-type': 'application/apply-patch+yaml' }, body: JSON.stringify(res) })
  return response
}

async function applyModule(m) {
  for (let r of m.resources) {
    await apply(r.resource)
  }
  await apply(m.cr.resource)
}

/**
 * 
 * @param {string} path api-server path, e.g /api/v1/namespaces/kyma-system/services/eventing-manager-metrics 
 * @returns the resource or undefined (resource not found)
 */
function get(path) {
  return fetch(path).then((res) => {
    if (res.status == 200) {
      return res.json()
    }
  }).catch((e) => console.log('e2', e))
}
function deleteModuleResources(m) {
  for (let r of m.resources) {
    if (r.path=='/api/v1/namespaces/kyma-system') {
      continue; // skip kyma-system deletion
    }
    fetch(r.path, { method: 'DELETE' })
  }
}
/**
 * 
 * @param {Object} m module
 * @param {string} m.name module name
 * @param {String[]} m.managedResources list of paths to resources (usually resource list) that are managed, e.g. ["/apis/serverless.kyma-project.io/v1alpha2/functions"]
 * @param {Object[]} m.resources list of kubernetes resources included in the module deployment
 * @param {Object} m.cr module configuration resource
 *  
 */
async function deleteModule(m) {
  let toDelete = await managedResourcesList(m)
  let body = `Do you want to delete module ${m.name}?`
  if (toDelete.length > 0) {
    body = "Can't delete module, because of these managed resources:<br>" + toDelete.join('<br/>')
      + '</br>Do you want to delete them first?'
    modal(body, "Delete confirmation", async () => {
      for (let i=0;i<5 && toDelete.length>0;++i) {
        for (let i of toDelete) {
          fetch(i, { method: 'DELETE' })
        }
        toDelete = await managedResourcesList(m)
        setTimeout(() => checkStatus(), 1000)
        await new Promise(r => setTimeout(r, 1000));
        
      }
      if (toDelete.length>0) {
        deleteModule(m)
      } else {
        deleteModuleResources(m)        
        setTimeout(() => checkStatus(), 3000)
      }
    })
    return 
  }
  modal("The module operator will be undeployed. Do you want to continue?", "Delete confirmation",
    () => {deleteModuleResources(m)
      setTimeout(() => checkStatus(), 3000)
    })
}
async function allResources() {
  let all = []
  let apis = await get('/apis')
  console.log(apis)
  for (let api of apis.groups) {
    for (let v of api.versions) {
      let resources = await get(`/apis/${v.groupVersion}`)
      if (resources) {
        for (let r of resources.resources) {
          if (!r.name.endsWith('/status')) {
            all.push(`/apis/${v.groupVersion}/${r.name}`)
          }
        }
      }
    }
  }
  return all
}
async function notManagedResources() {
  let all = await allResources()
  let managed = [];
  for (let m of modules) {
    if (m.managedResources) {
      for (let i of m.managedResources) {
        managed.push(i)
      }
    } else {
      console.log("No managed resources for ", m.name, m.managedResources)
    }
  }
  return all.filter((r) => !managed.some((m) => m == r))
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

async function resPath(r) {
  let url = (r.apiVersion === 'v1') ? '/api/v1' : `/apis/${r.apiVersion}`
  let api = groupVersions[r.apiVersion]
  let resource = null
  if (api) {
    resource = api.resources.find((res) => res.kind == r.kind)
  }
  if (resource == null) {
    api = await cacheAPI(r.apiVersion)
    resource = api.resources.find((res) => res.kind == r.kind)
  }
  if (resource) {
    let ns = r.metadata.namespace || 'default'
    let nsPath = resource.namespaced ? `/namespaces/${ns}` : ''
    return url + nsPath + `/${resource.name}/${r.metadata.name}`
  }
  return null

}
async function exists(path) {
  if (!path) {
    return false;
  }
  let response = await fetch(path)
  return (response.status == 200)
}

async function cacheAPI(apiVersion) {
  let url = (apiVersion === 'v1') ? '/api/v1' : `/apis/${apiVersion}`
  let res = await fetch(url)
  if (res.status == 200) {
    let body = await res.json()
    groupVersions[apiVersion] = body
    return body
  }
  return { resources: [] }
}

function deploymentList(m) {
  let div = document.createElement("div")
  if (m.details) {
    let html = '<ul class="list-group">'
    for (let r of m.resources) {
      let badge = `<span class="badge bg-secondary"> - </span>`
      if (r.status === true) {
        badge = `<span class="badge bg-success">installed</span>`
      }
      html += `<li class="list-group-item"><small>
        <a href="${r.path}" target="_blank">${r.path}</a> ${badge}</small></li>`
    }
    div.innerHTML = html + '</ul>'
  }
  return div
}
function resourcesBadge(m) {
  let c = 0
  for (let r of m.resources) {
    if (r.status) {
      c++
    }
  }
  if (c == m.resources.length) {
    return `<span class="badge bg-success">${c} / ${m.resources.length}</span>`
  }
  return `<span class="badge bg-secondary">${c} / ${m.resources.length}</span>`
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
    return `<span class="badge text-bg-dark">SKR</span>`
  }
  if (m.community) {
    return `<span class="badge bg-info text-dark">community</span>`
  }
  return ''
}
function installBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "install"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", function (event) {
    applyModule(m)
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

function deleteBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "delete"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", function () {
    deleteModule(m)
  })
  return btn
}

function moduleCard(m) {
  let buttons = document.createElement("div")
  buttons.setAttribute('class','d-inline-flex gap-1')
  if (!m.managed) {
    buttons.appendChild(installBtn(m))
    buttons.appendChild(deleteBtn(m))
  }
  buttons.appendChild(detailsBtn(m))
  let col = document.createElement('div')
  col.setAttribute('class', 'col mb-3')
  let card = document.createElement("div")
  card.setAttribute('class', 'card h-100')
  let cardBody = document.createElement('div')
  cardBody.setAttribute('class', 'card-body')
  let txt = document.createElement("div")
  let html = `<h5>${m.name} ${moduleBadge(m)}</h5>
    <small>
    <a href="${m.deploymentYaml}" target="_blank">deployment YAML</a> ${resourcesBadge(m)}<br/>
    <a href="${m.cr.path}" target="_blank">configuration CR</a> ${crBadge(m)}<br/></small><br/>`
  txt.innerHTML = html
  cardBody.appendChild(txt)
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
    let div = document.getElementById('modules');
    div.innerHTML = ""
    for (let m of modules) {
      div.appendChild(moduleCard(m))
    }
  }
}
async function managedModules() {
  const KYMA_PATH = '/apis/operator.kyma-project.io/v1beta2/namespaces/kyma-system/kymas/default'
  let kyma = await get(KYMA_PATH)
  console.log('KYMA',kyma)
  if (kyma) {
    kyma.spec.modules.push({name:'istio'})  // implicit SKR module
    kyma.spec.modules.push({name:'api-gateway'}) // implicit SKR module
    for (let m of kyma.spec.modules) {
      let module = modules.find((mod)=> mod.name==m.name)
      if (module) {
        module.managed=true
      }
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
  await managedModules()
  checkStatus()
}

function checkStatus() {
  for (let m of modules) {
    resPath(m.cr.resource).then((p) => {
      m.cr.path = p
      return (p) ? fetch(p) : null
    }).then((res) => {
      if (res) {
        m.cr.status = (res.status == 200)
        return m.cr.status ? res.json() : null
      }
      return null
    }
    ).then((body) => {
      m.cr.value = body
      renderModules(m)
    })

    for (let r of m.resources) {
      if (r.path) {
        fetch(r.path).then((res) => {
          if (res.status == 200) {
            r.status = true
            return res.json()
          } else {
            r.status = false
            r.value = undefined
          }
          return null
        }).then((json) => {
          r.value = json
        }).finally(() => {
          renderModules(m)
        })
      }
    }
  }
}

function getPods() {
  fetch('/api/v1/pods')
    .then((response) => response.json())
    .then((podList) => {
      pods = podList.items.sort((a, b) => {
        let cmp = a.metadata.namespace.localeCompare(b.metadata.namespace)
        if (cmp == 0) {
          cmp = a.metadata.name.localeCompare(b.metadata.name)
        }
        return cmp
      })
      renderPods()
    })
}

function renderPods() {
  let html = ''
  pods.forEach(element => {
    html += element.metadata.namespace + ' ' + element.metadata.name + '<br/>'
  });
  document.getElementById('pods').innerHTML = html

}
function renderNotManagedResources(list) {
  document.getElementById("unmanaged").innerHTML = list.join("<br/>")
}

loadChannel()
  // .then(notManagedResources)
  // .then(renderNotManagedResources)
