const url = new URL(window.location);
const API_PREFIX = url.searchParams.get("api") || ''
var groupVersions = {}


async function apply(res) {
  let path = await resPath(res)
  path += '?fieldManager=kubectl&fieldValidation=Strict&force=false'
  let response = await fetch(API_PREFIX + path, { method: 'PATCH', headers: { 'content-type': 'application/apply-patch+yaml' }, body: JSON.stringify(res) })
  return response
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

function get(path) {
  return fetch(API_PREFIX + path).then((res) => {
    if (res.status == 200) {
        return res.json()
    }
    return undefined
  }).catch((e) => {
    return undefined
  })
}
async function deleteResource(pathOrResource) {
  if (typeof pathOrResource === 'string' || pathOrResource instanceof String) {
    return fetch(API_PREFIX + pathOrResource, { method: 'DELETE' })
  }
  else {
    let path = await resPath(pathOrResource)
    return fetch(API_PREFIX + path, { method: 'DELETE' })
  }
}
function patchResource(path, body) {
  fetch(API_PREFIX + path, { method: 'PATCH', headers: { 'content-type': 'application/json-patch+json' }, body })
}

async function cacheAPI(apiVersion) {
  let url = (apiVersion === 'v1') ? '/api/v1' : `/apis/${apiVersion}`
  let res = await fetch(API_PREFIX + url)
  if (res.status == 200) {
    let body = await res.json()
    groupVersions[apiVersion] = body
    return body
  }
  return { resources: [] }
}

export {apply, get, deleteResource, patchResource, resPath}