function ServiceManager(opts = credentials) {
  this.clientid = atob(opts.data.clientid)
  this.clientsecret = atob(opts.data.clientsecret)
  this.sm_url = atob(opts.data.sm_url)
  this.tokenurl = atob(opts.data.tokenurl)
  this.cluster_id = atob(opts.data.cluster_id)

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
    let si = instances.items.filter(i => i.context.clusterid == this.cluster_id)
    for (let i of si) {
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
    return si
  }
}

export {ServiceManager}