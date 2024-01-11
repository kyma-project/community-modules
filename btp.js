import crypto from 'crypto'
const CLI_SERVER = process.env.CLI_SERVER || "https://cpcli.cf.eu10.hana.ondemand.com"
const CLI_VERSION = "v2.54.0"
const REFRESH_HEADER = "x-cpcli-replacementrefreshtoken"
const ID_TOKEN_HEADER = "x-id-token"
const SUBDOMAIN_HEADER = "x-cpcli-subdomain"

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function BtpClient() {

  this.ssoUrl = function () {
    let id = uuidv4()
    return { id, url: `${CLI_SERVER}/login/${CLI_VERSION}/browser/${id}` }
  }
  this.sso = async function (id) {
    console.log("CLI Server:", CLI_SERVER)
    let body = { "customIdp": "", "subdomain": "" }
    let req_headers = {
      'Accept': 'application/json',
      'Content-type': 'application/json',
      'x-cpcli-format': 'json'
    }

    let res = await fetch(`${CLI_SERVER}/login/${CLI_VERSION}/browser/${id}`,
      { method: 'POST', headers: req_headers, body: JSON.stringify(body) }
    )
    let account = await res.json()
    this.refreshToken = account.refreshToken
    return account
  }

  this.dump = async function(options){
    const start = performance.now();
    let gas = await this.globalAccounts()
    this.gas = gas.filter(ga => {
      if (options.globalAccount) {
        return ga.subdomain == options.globalAccount || ga.guid == options.globalAccount || ga.displayName == options.globalAccount 
      }
      return true
    })
    let tasks = []

    for (let ga of gas) {
      ga.sAccounts=[]
      let sub = await this.subAccounts(ga.subdomain)
      ga.sAccounts = sub.value.filter(sa => {
        if (options.subAccount) {
          return sa.guid == options.subAccount || sa.displayName == options.subAccount
        }
        return true
      })
      for (let sa of ga.sAccounts) {
        sa.instances = []
        sa.bindings = []
        tasks.push(this.serviceInstances(ga.subdomain, sa).then((si) => { sa.instances = si || [] }))
        tasks.push(this.serviceBindings(ga.subdomain, sa).then((bi) => { sa.bindings = bi || []}))
        tasks.push(this.serviceOfferings(ga.subdomain, sa).then((so) => { sa.offerings = so || [] }))
        tasks.push(this.servicePlans(ga.subdomain, sa).then((sp) => { sa.plans = sp || []}))
        
      }
    }
    await Promise.all(tasks)
    const end = performance.now();
    console.log("Execution time: ", end - start);
    return this.gas

  }
  this.post = async function(url, body, subdomain, custom_headers = {}) {
    let req_headers = {
      'Accept': 'application/json',
      'Content-type': 'application/json',
      'x-cpcli-refreshtoken': this.refreshToken,
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
      this.refreshToken = headers.get(REFRESH_HEADER)
      console.log("New refresh token:", this.refreshToken)
    }
    if (response.status == 307) {
      return this.post(headers.get('location'), body, subdomain, { 'x-id-token': headers.get(ID_TOKEN_HEADER), 'x-cpcli-subdomain': headers.get(SUBDOMAIN_HEADER) })
    }
  
    let data = await response.text()
    try {
      return JSON.parse(data)
    } catch (err) {
      return null
    }
  }
  this.globalAccounts = async function () {
    let accounts = await this.post(`${CLI_SERVER}/client/${CLI_VERSION}/globalAccountList`)
    return accounts
  }
  this.subAccounts = async function (subdomain) {
    let body = { paramValues: { globalAccount: subdomain } }
    return this.post(`${CLI_SERVER}/command/${CLI_VERSION}/accounts/subaccount?list`, JSON.stringify(body), subdomain)
  }  
  this.serviceInstances =  function (subdomain, sa) {
    let body = { paramValues: { subaccount: sa.guid } }
    return this.post(`${CLI_SERVER}/command/${CLI_VERSION}/services/instance?list`, JSON.stringify(body), subdomain)
  }
  this.serviceBindings = function (subdomain, sa) {
    let body = { paramValues: { subaccount: sa.guid } }
    return this.post(`${CLI_SERVER}/command/${CLI_VERSION}/services/binding?list`, JSON.stringify(body), subdomain)
  }
  this.serviceOfferings = function (subdomain, sa) {
    let body = { paramValues: { subaccount: sa.guid } }
    return this.post(`${CLI_SERVER}/command/${CLI_VERSION}/services/offering?list`, JSON.stringify(body), subdomain)
  }
  this.servicePlans = function (subdomain, sa) {
    let body = { paramValues: { subaccount: sa.guid } }
    return this.post(`${CLI_SERVER}/command/${CLI_VERSION}/services/plan?list`, JSON.stringify(body), subdomain)
  }

    
}

export { BtpClient }