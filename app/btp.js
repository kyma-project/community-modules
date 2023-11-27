import { cliProxy } from './btp-cli.js'
import { apply, deleteResource, get, resPath } from './k8s.js'

const state = {}
const CLI_BASE = "http://127.0.0.1:8001/api/v1/namespaces/default/services/btp-cli/proxy"
const CLI_SERVER = CLI_BASE+"/eu10"
var REFRESH_TOKEN = ''
const REFRESH_HEADER = "x-cpcli-replacementrefreshtoken"
const ID_TOKEN_HEADER = "X-Id-Token"
const SUBDOMAIN_HEADER = "x-cpcli-subdomain"
var USER = {}

async function deployBtpCliProxy() {
  for (let r of cliProxy) {
    await apply(r)
  }
}

async function undeployBtpCliProxy() {
  for (let r of cliProxy) {
    await deleteResource(r)
  }
}

function findDeployment(resources) {
  return resources.find((r) => r.kind == 'Deployment')
}



async function isProxyReady() {
  console.log("IS PROXY READY?")
  let d = findDeployment(cliProxy)
  let path = await resPath(d)
  let proxyDeployment = await get(path)
  console.log(proxyDeployment)
  return isDeploymentReady(proxyDeployment)
}

async function isDeploymentReady(r) {
  if (r && r.kind == 'Deployment') {
    if (r.status && r.status.conditions) {
      let av = r.status.conditions.find(c => c.type == 'Available')
      if (av && av.status == "True") {
        return true
      }
    }
  }
  return false

}

function proxyBtn() {
  let btn = document.createElement("button")
  btn.textContent = "BTP CLI Proxy"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", async function () {
    await deployBtpCliProxy()
    setTimeout(checkState, 2000)
  })
  return btn
}

function subaccountsBtn(ga) {
  let btn = document.createElement("button")
  btn.textContent = "Subaccounts"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", async function () {
    let sAccounts=await subAccounts(ga.subdomain)
    ga.subAccounts=sAccounts
    renderBtp()
  })
  return btn
}

function undeployProxyBtn() {
  let btn = document.createElement("button")
  btn.textContent = "Delete BTP CLI Proxy"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", async function () {
    await undeployBtpCliProxy()
    setTimeout(checkState, 2000)
  })
  return btn
}
async function scanAll() {
  let gaList = await globalAccounts() 
  state.gAccounts=gaList
  window.gaList=gaList
  for (let ga of gaList) {
    let saList = await subAccounts(ga.subdomain)
    if (saList) {
      console.log("SA list", saList)
      ga.subAccounts = saList
      for (let sa of saList) {
        let siList = await serviceInstances(ga.subdomain,sa)
        sa.serviceInstances=siList
        let bidings = await serviceBindings(ga.subdomain,sa)
        sa.serviceBidings=bidings
      }
  
    }
  }
  return gaList
}
function ssoBtn() {
  let btn = document.createElement("button")
  btn.textContent = "SSO"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", async function () {
    let id = uuidv4()
    let body = { "customIdp": "", "subdomain": "" }
    let req_headers = {
      'Accept': 'application/json',
      'Content-type': 'application/json',
      'x-cpcli-format': 'json'
    }

    fetch(`${CLI_SERVER}/login/v2.54.0/browser/${id}`,
      { method: 'POST', headers: req_headers, body: JSON.stringify(body) }
    ).then((res) => {
      return res.json()
    }).then(async (u) => {
      USER = u
      console.log("USER", u)
      REFRESH_TOKEN = u.refreshToken
      let gAccounts = await globalAccounts()
      state.gAccounts = gAccounts
      renderBtp()      
    })
    window.open(`${CLI_SERVER}/login/v2.54.0/browser/${id}`, '_blank')
  })
  return btn
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function renderBtp() {
  console.log("CLI proxy", cliProxy)
  let buttons = document.getElementById('topButtons')
  buttons.innerHTML = ""
  if (state.proxyReady) {
    buttons.appendChild(undeployProxyBtn())
    buttons.appendChild(ssoBtn())
  } else {
    buttons.appendChild(proxyBtn())
  }
  renderGlobalAccounts()
  // let gaList = document.createElement('ul')
  // gaList.setAttribute('class','list-group')
  // if (state.gAccounts){
  //   for (let ga of state.gAccounts) {
  //     let item = document.createElement('li')
  //     item.setAttribute('class','list-group-item d-flex justify-content-between align-items-start')
  //     item.textContent=ga.displayName
  //   }
  
  // }
}

async function checkState() {
  state.proxyReady = await isProxyReady()
  renderBtp()
}

checkState()
function GACard(ga) {
  let buttons = document.createElement("div")
  buttons.setAttribute('class', 'd-inline-flex gap-1')
  buttons.appendChild(subaccountsBtn(ga))
  let col = document.createElement('div')
  col.setAttribute('class', 'col mb-6')
  let card = document.createElement("div")
  card.setAttribute('class', 'card h-100')
  let cardBody = document.createElement('div')
  cardBody.setAttribute('class', 'card-body')
  let txt = document.createElement("div")
  let html = `<h5>${ga.displayName} </h5>
  <small>
  subdomain: ${ga.subdomain}<br/>
  guid: ${ga.guid}<br/>
    </small>`
  txt.innerHTML = html
  cardBody.appendChild(txt)
  cardBody.appendChild(buttons)
  card.appendChild(cardBody)
  col.appendChild(card)
  return col

}
function instancesBtn(subdomain,sa){
  let btn = document.createElement("button")
  btn.textContent = "Services"
  btn.setAttribute('class', 'btn btn-outline-primary btn-sm')
  btn.addEventListener("click", async function () {
    let instances=await serviceInstances(subdomain,sa)
    sa.serviceInstances=instances
    renderBtp()
    
  })
  return btn
}

function SACard(subdomain,sa) {
  let buttons = document.createElement("div")
  buttons.setAttribute('class', 'd-inline-flex gap-1')
  buttons.appendChild(instancesBtn(subdomain, sa))
  let col = document.createElement('div')
  col.setAttribute('class', 'col mb-3')
  let card = document.createElement("div")
  card.setAttribute('class', 'card h-100')
  let cardBody = document.createElement('div')
  cardBody.setAttribute('class', 'card-body')
  let txt = document.createElement("div")
  let html = `<h5>${sa.displayName} </h5>
  <small>
  subdomain: ${sa.subdomain}<br/>
  guid: ${sa.guid}<br/>
  region: ${sa.region}<br/>
    </small>`
  txt.innerHTML = html
  cardBody.appendChild(txt)
  cardBody.appendChild(buttons)
  card.appendChild(cardBody)
  col.appendChild(card)
  return col

}
function SICard(si) {
  let buttons = document.createElement("div")
  buttons.setAttribute('class', 'd-inline-flex gap-1')
  let col = document.createElement('div')
  col.setAttribute('class', 'col mb-3')
  let card = document.createElement("div")
  card.setAttribute('class', 'card h-100')
  let cardBody = document.createElement('div')
  cardBody.setAttribute('class', 'card-body')
  let txt = document.createElement("div")
  let html = `<h5>${si.name} </h5>
  <small>
  platform: ${si.platform_id}<br/>
  service plan: ${si.service_plan_id}<br/>
  </small>`
  txt.innerHTML = html
  cardBody.appendChild(txt)
  cardBody.appendChild(buttons)
  card.appendChild(cardBody)
  col.appendChild(card)
  return col

}
function renderGlobalAccounts() {
  let div = document.getElementById('content')
  div.innerHTML = ""
  if (state.gAccounts) {
    for (let ga of state.gAccounts) {
      div.appendChild(GACard(ga))
      if (ga.subAccounts) {
        for (let sa of ga.subAccounts) {
          div.appendChild(SACard(ga.subdomain,sa))
            if (sa.serviceInstances) {
              for (let si of sa.serviceInstances) {
                div.appendChild(SICard(si))
                
              }
            }
        }
      }
    }  
  }
}
async function post(url, body, subdomain, custom_headers = {}) {
  console.log("POST url", url, "token:", REFRESH_TOKEN)
  let req_headers = {
    'Accept': 'application/json',
    'Content-type': 'application/json',
    'x-cpcli-refreshtoken': REFRESH_TOKEN,
    'x-cpcli-subdomain': subdomain,
    'x-cpcli-format': 'json', ...custom_headers
  }
  let response = await fetch(url, {
    method: 'POST',
    headers: req_headers,
    redirect: 'manual',
    body
  })
  let headers = response.headers
  if (headers && headers.has(REFRESH_HEADER)) {
    REFRESH_TOKEN = headers.get(REFRESH_HEADER)
    console.log("New refresh token:", REFRESH_TOKEN)
  }
  console.log("Response status:", response.status)
  if (response.type == "opaqueredirect") {
    console.log(response.headers)
    console.log("Temporary redirect with ID token: ", headers.get(ID_TOKEN_HEADER))
    // return post(url, body, subdomain, { ID_TOKEN_HEADER: headers.get(ID_TOKEN_HEADER), SUBDOMAIN_HEADER: headers.get(SUBDOMAIN_HEADER) })
  }

  let data = await response.text()
  try {
    return JSON.parse(data)
  } catch (err) {
    return data
  }

}

async function globalAccounts() {
  let accounts = await post(`${CLI_SERVER}/client/v2.54.0/globalAccountList`)
  return accounts
}

async function subAccounts(subdomain) {
  let body = { paramValues: { globalAccount: subdomain } }
  let accounts = await post(`${CLI_SERVER}/command/v2.54.0/accounts/subaccount?list`, JSON.stringify(body), subdomain)

  return accounts.value
}

async function serviceInstances(subdomain, sa) {
  try {
    let body = { paramValues: { subaccount: sa.guid } }
    let instances = await post(`${CLI_BASE}/${sa.region}/command/v2.54.0/services/instance?list`, JSON.stringify(body), subdomain)
    return instances

  } catch (err) {
    console.log(err)
  }
}
async function serviceBindings(subdomain, sa) {
  try {
    let body = { paramValues: { subaccount: sa.guid } }
    let bidings = await post(`${CLI_BASE}/${sa.region}/command/v2.54.0/services/binding?list`, JSON.stringify(body), subdomain)
    return bidings

  } catch (err) {
    console.log(err)
  }
}

if (REFRESH_TOKEN) {
  globalAccounts().then((accounts) => {
    state.gAccounts = accounts

  })
}

export { renderBtp }