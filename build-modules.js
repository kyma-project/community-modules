import * as jsYaml from 'js-yaml'
import * as fs from 'fs'
import modules from "./modules.js";
import { semVerCompare, isSemVer } from './semver.js'

async function getGithubRelease(m,v) {
  if (m.latestGithubRelease) {
    const headers = {}
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    let path = `https://api.github.com/repos/${m.latestGithubRelease.repository}/releases`
    try {
      let res = await fetch(path, { headers })
      if (res.status != 200) {
        console.log("error fetching release", m.name, res.status)
        return
      }
      let body = await res.json()
      for (let r of body) {
        if (r.tag_name == v.version) {
          let deploymentYaml = r.assets.find(a => a.name == m.latestGithubRelease.deploymentYaml)
          let crYaml = r.assets.find(a => a.name == m.latestGithubRelease.crYaml)
          if (!v.deploymentYaml) {
            v.deploymentYaml = deploymentYaml.browser_download_url
            console.log("deploymentYaml", v.deploymentYaml)
          }
          if (!v.crYaml) {
            v.crYaml = crYaml.browser_download_url
            console.log("crYaml", v.crYaml) 
          }          
        }
      }


    } catch(e) {
      console.log(e)
    }
  }
}
async function getLatestVersion(m) {
  if (m.latestGithubRelease) {
    const headers = {}
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    let path = `https://api.github.com/repos/${m.latestGithubRelease.repository}/releases/latest`
    try {
      let res = await fetch(path, { headers })
      if (res.status != 200) {
        console.log("error fetching latest release for module", m.name, res.status)
        return
      }
      let body = await res.json()
      let version = body.tag_name
      let deploymentYaml = body.assets.find(a => a.name == m.latestGithubRelease.deploymentYaml)
      let crYaml = body.assets.find(a => a.name == m.latestGithubRelease.crYaml)
      let existing = m.versions.find(v => v.version == version)
      if (existing) {
        if (existing.deploymentYaml != deploymentYaml.browser_download_url) {
          console.log(deploymentYaml.browser_download_url, "<>", existing.deploymentYaml)
          throw new Error("Deployment YAML URL mismatch for latest release of module " + m.name)
        }
        if (existing.crYaml != crYaml.browser_download_url) {
          console.log(crYaml.browser_download_url, "<>", existing.crYaml)
          throw new Error("CR YAML URL mismatch for latest release of module " + m.name)
        }
      } else if (isSemVer(version)) {
        console.log("adding latest version", version, "to module", m.name)
        m.versions.push({
          version: version,//trimNonDigitsPrefix(version),
          deploymentYaml: deploymentYaml.browser_download_url,
          crYaml: crYaml.browser_download_url
        })
      }
    } catch (e) {
      console.log(e)
    }
  }
}

function operatorImage(r) {
  const skip = ['kube-rbac-proxy']
  if (r.kind == 'Deployment') {
    for (let c of r.spec.template.spec.containers) {
      if (skip.find(s => c.name.includes(s))) {
        continue
      }
      return c.image
    }
  }
  return null
}

function resPath(r, manifest) {
  for (let res of manifest) {
    if (res.kind == 'CustomResourceDefinition' && res.spec.names.kind == r.kind) {
      for (let v of res.spec.versions) {
        if (res.spec.group + '/' + v.name == r.apiVersion) {
          if (res.spec.scope == 'Namespaced') {
            return `/apis/${r.apiVersion}/namespaces/${r.metadata.namespace}/${res.spec.names.plural}/${r.metadata.name}`
          } else {
            return `/apis/${r.apiVersion}/${res.spec.names.plural}/${r.metadata.name}`
          }
        }
      }
    }
  }
  return null
}
function isNamespaced(r, manifest) {
  for (let res of manifest) {
    if (res.kind == 'CustomResourceDefinition' && res.spec.names.kind == r.kind) {
      for (let v of res.spec.versions) {
        if (res.spec.group + '/' + v.name == r.apiVersion) {
          return (res.spec.scope == 'Namespaced')
        }
      }
    }
  }
  return undefined
}

async function loadModule(m, v) {
  let url = v.deploymentYaml || m.deploymentYaml
  const resources = []
  if (url) {
    let response = await fetch(url)
    let body = await response.text()
    jsYaml.loadAll(body, (doc) => {
      resources.push(doc)
    });
    v.resources = resources
    // fs.writeFileSync(`public/${m.name}-${v.version}.json`, JSON.stringify(resources, null, 2))
    // console.log("module resources written to :", `build/${m.name}-${v.version}.json`)
  }
  v.managerPath = managerPath(resources)
  v.managerImage = managerImage(resources)
  
  url = v.crYaml || m.crYaml
  
  if (!v.cr && url) {
    let response = await fetch(url)
    if (response.status != 200) {
      throw new Error("Resource not found: " + url)
    }
    let body = await response.text()
    v.cr = jsYaml.load(body)
    if (!v.cr.metadata.namespace && isNamespaced(v.cr, resources)) {
      v.cr.metadata.namespace = 'kyma-system'
    }
    if (!v.crPath) {
      v.crPath = resPath(v.cr, resources)
    }
  }
}

async function latestVersions() {
  console.log("checking latest versions")
  const tasks = []
  for (let m of modules) {
    tasks.push(getLatestVersion(m))
  }
  await Promise.allSettled(tasks)
  console.log("latest versions checked")
}

async function build() {
  await latestVersions()
  const tasks = []
  for (let m of modules) {
    for (let v of m.versions) {
      v.cr = v.cr || m.cr
      tasks.push(loadModule(m, v))
    }
  }
  await Promise.allSettled(tasks)

  if (fs.existsSync('module-manifests/modules')) {
    console.log("loading managed modules")
    let managedModules = loadModulesFromManifests('module-manifests/modules')
    for (let man of managedModules){
      let m = modules.find(mod => mod.name == man.name)
      if (!m) {
        console.error('module ',man.name,'not found in modules.js')
      } else {
        for (let mv of man.versions) {
          let v = m.versions.find(ver => ver.version == mv.version)
          if (v) {
            console.error('managed version ',mv.version,'already  found in module ',m.name)
            Object.assign(v,mv)
            
          } else {
            console.log('adding managed version ',mv.version,'to module ',m.name)

            m.versions.push(mv)
          }
        }
      }
    }
  
  } else{
    console.log("No managed modules found. Clone module-manifests repo to add managed modules.")
  }
  let tasks2 = []
  modules.forEach(m => {
    m.versions.sort(semVerCompare)
    console.log("checking github releases for module", m.name)
    m.versions.forEach(async v => {
      console.log("  version", v.version)
      tasks2.push(getGithubRelease(m,v))
    })
  })
  await Promise.allSettled(tasks2)
  let filtered = modules.filter(m => m.versions.length > 0) 
  let code = `export default ${JSON.stringify(filtered, null, 2)}`
  fs.writeFileSync(`model.js`, code)
  fs.writeFileSync(`model.json`, JSON.stringify(filtered, null, 2))
  console.log("modules written:", `model.js and model.json`)
}

function getFolders(parentFolder) {
  return fs.readdirSync(parentFolder, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}

function managerPath(resources) {
  for (let r of resources) {
    if (r.kind == 'Deployment') {
      const ns = r.metadata.namespace || 'kyma-system'
      const name = r.metadata.name
      return  `/apis/apps/v1/namespaces/${ns}/deployments/${name}`
    }
  }
  return null
}

function managerImage(resources) {
  for (let r of resources) {
    if (r.kind == 'Deployment') {
      return operatorImage(r)
    }
  }
}

function loadModuleFromFolder(folder,name) {
  console.log("loading module", name, "from folder", folder)
  let m = { name, versions: [] }
  getFolders(`${folder}/${name}`).forEach(channel => {
    if (channel == 'dev') return // skip dev channel
    let moduleConfig = null
    try {
      moduleConfig = fs.readFileSync(`${folder}/${name}/${channel}/module-config.yaml`, 'utf8')
    } catch (e) {
      console.error("error reading module-config.yaml for module", name, channel)
      return;
    }
    let module = jsYaml.load(moduleConfig)
    let n = module.name.split('/')[module.name.split('/').length - 1]
    if (n != name) {
      console.error("module name mismatch", n, name, channel)
      throw new Error("module name mismatch")
    }
    let version = module.version
    let v = m.versions.find(ver => ver.version == version)
    if (v) {
      v.channels.push(channel)
    } else {
      v = { version, channels: [channel] }
      m.versions.push(v)
    }
    let manifest = fs.readFileSync(`${folder}/${name}/${channel}/${module.manifest}`, 'utf8')

    let resources = []
    jsYaml.loadAll(manifest, (doc) => {
      resources.push(doc)
    });

    v.documentation = module.annotations["operator.kyma-project.io/doc-url"]
    v.repository = module.moduleRepo
    v.managerPath = managerPath(resources)
    v.managerImage = managerImage(resources)
    if (!v.repository.includes('wdf.sap.corp')) {
      v.resources = resources
    }

    let crYaml = fs.readFileSync(`${folder}/${name}/${channel}/${module.defaultCR}`, 'utf8')
    v.cr = jsYaml.load(crYaml)
    if (!v.cr.metadata.namespace && isNamespaced(v.cr, resources)) {
      v.cr.metadata.namespace = 'kyma-system'
    }
    if (!v.crPath) {
      v.crPath = resPath(v.cr, resources)
    }

  })
  return m
}

function loadModulesFromManifests(folder) {
  let names = getFolders(folder)
  let modules = []
  for (let name of names) {
    let m = loadModuleFromFolder(folder,name)
    if (m.versions.length > 0) {
      modules.push(m)
    } else {
      console.log("skipping module", name, "- no versions found")
    }
  }
  return modules
}
build()
