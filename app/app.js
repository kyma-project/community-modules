var pods = []
var groupVersions = {}
var channel='https://kyma-project.github.io/community-modules/latest.json'
var modules=[]

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
      } else if (r.status === false) {
        badge = `<span class="badge bg-success">not applied</span>`        
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
  if (m.community) {
    return `<span class="badge bg-info text-dark"> community </span>` 
  }
  return ''
}
function installBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = "install"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", function (event) {
    applyModule(m)
    setTimeout(()=>checkStatus(),3000)    
  })
  return btn
}

function detailsBtn(m) {
  let btn = document.createElement("button")
  btn.textContent = (m.details) ? "hide details" : "details"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", function (event) {
    m.details = !m.details
    renderModules()
  })
  return btn
}

function moduleCard(m) {
  let buttons = document.createElement("div")
  buttons.appendChild(installBtn(m))
  buttons.appendChild(detailsBtn(m))
  let col = document.createElement('div')
  col.setAttribute('class','col mb-3')
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

async function loadChannel() {
  let res = await fetch(channel)
  let json = await res.json()
  modules=json
  for (let m of modules) {
    let crPath = await resPath(m.cr.resource)
    m.cr.path = crPath

    for (let i of m.resources) {
      let path = await resPath(i.resource)
      i.path = path
    }
    renderModules()
  }
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
          }
          return null
        }).then((json) => {
          r.value = json          
        }).finally(()=>{
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

loadChannel()
