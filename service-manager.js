const credentials = {
  data: {
    "clientid": "sb-98de75b9-6c5e-43d1-8413-a5f18f50b0d8!b232352|service-manager!b3",
    "clientsecret": "8672fbed-ad2d-43cb-b0b6-fb5de49127ee$eYkcvyytJHpZfvgIHgO_l3y_EwadFWCZiOHaZlbLGbI=",
    "sm_url": "https://service-manager.cfapps.eu12.hana.ondemand.com",
    "tokenurl": "https://aws-ipxdm8ab.authentication.eu12.hana.ondemand.com"
  }
}

function ServiceManager(opts = credentials) {
  this.clientid = atob(opts.data.clientid)
  this.clientsecret = atob(opts.data.clientsecret)
  this.sm_url = atob(opts.data.sm_url)
  this.tokenurl = atob(opts.data.tokenurl)

  this.authenticate = async function () {
    let res = await fetch(this.tokenurl+'/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&client_id=${this.clientid}&client_secret=${this.clientsecret}`
    })
    if (res.status == 200) {
      let json = await res.json()
      this.token = json.access_token
      return json
    }
  }
  this.get = async function (path) {
    try{
      let res = await fetch(`${this.sm_url}${path}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      })
      if (res.status == 200) {
        let json = await res.json()
        return json
      } else {
        console.log(res.status)
        let body = await res.text()
        console.log(body) 
      }
  
    } catch(e) {
      console.error(e)
    }
  }
  this.serviceInstances = async function () {
    let instances = await this.get('/v1/service_instances')
    let plans = await this.get('/v1/service_plans')
    let bindings = await this.get('/v1/service_bindings')
    let offerings = await this.get('/v1/service_offerings')
    for (let i of instances.items) {
      let plan = plans.items.find(p => p.id == i.service_plan_id)
      let offering = offerings.items.find(o => o.id == plan.service_offering_id)
      if (plan) {
        i.plan_name=plan.name
      }
      if (offering) {
        i.offering_name=offering.name
      }
      i.bindings = bindings.items.filter(b => b.service_instance_id == i.id)
    }
    return instances.items
  }
}

export {ServiceManager}