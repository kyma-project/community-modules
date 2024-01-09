
function Client(apiPrefix, options) {
  this.options = { ...options }
  this.apiPrefix = apiPrefix
  this.groupVersions = {}

  this.apply = async function (res) {
    let path = await this.resPath(res)
    path += '?fieldManager=kubectl&fieldValidation=Strict&force=false'
    let o = {
      ...this.options,
      method: 'PATCH',
      body: JSON.stringify(res), 
    }
    o.headers= {...o.headers, 'content-type': 'application/apply-patch+yaml' }   
    let response = await fetch(this.apiPrefix + path,o )
    await response.text()
    console.log(res.kind,res.metadata.name,response.status<300 ? 'applied' : `error:${response.status}` )
    return response
  }

  this.resPath = async function (r) {
    let url = (r.apiVersion === 'v1') ? '/api/v1' : `/apis/${r.apiVersion}`
    let api = this.groupVersions[r.apiVersion]
    let resource = null
    if (api) {
      resource = api.resources.find((res) => res.kind == r.kind)
    }
    if (resource == null) {
      api = await this.cacheAPI(r.apiVersion)
      resource = api.resources.find((res) => res.kind == r.kind)
    }
    if (resource) {
      let ns = r.metadata.namespace || 'default'
      let nsPath = resource.namespaced ? `/namespaces/${ns}` : ''
      return url + nsPath + `/${resource.name}/${r.metadata.name}`
    }
    return null
  }

  this.get = function (path) {
    return fetch(this.apiPrefix + path,{
      method: 'GET',
      ...this.options
    }).then((res) => {
      if (res.status == 200) {
        return res.json()
      }
      return undefined
    }).catch((e) => {
      return undefined
    })
  }
  this.deleteResource = async function (pathOrResource) {
    if (typeof pathOrResource === 'string' || pathOrResource instanceof String) {
      return fetch(this.apiPrefix + pathOrResource, { method: 'DELETE', ...this.options })
    }
    else {
      let path = await this.resPath(pathOrResource)
      return fetch(this.apiPrefix + path, { method: 'DELETE', ...this.options })
    }
  }
  this.patchResource = function (path, body) {
    fetch(this.apiPrefix + path, { method: 'PATCH', headers: { 'content-type': 'application/json-patch+json' }, body, ...this.options })
  }

  this.cacheAPI = async function (apiVersion) {
    let url = (apiVersion === 'v1') ? '/api/v1' : `/apis/${apiVersion}`
    let res = await fetch(this.apiPrefix + url,{
      method: 'GET',
      ...this.options
    })
    if (res.status == 200) {
      let body = await res.json()
      this.groupVersions[apiVersion] = body
      return body
    }
    return { resources: [] }
  }

}

export { Client }