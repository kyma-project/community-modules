const jsyaml = require('js-yaml')
const fs = require('fs')
const channels = require('../app/channels.json')
const modules = require('../app/modules.json')

async function loadModule(m) {
  let url = m.deploymentYaml
  if (url) {
    m.resources = []
    let response = await fetch(url)
    let body = await response.text()
    jsyaml.loadAll(body, (doc) => {
      m.resources.push({ resource: doc })
    });
  }
  for (let r of m.resources) {
    if (r.resource.kind == 'Deployment') {
      m.deploymentVersion = r.resource.spec.template.spec.containers[0].image
      break;
    }
  }
  url = m.crYaml
  if (url) {
    response = await fetch(url)
    if (response.status != 200) {
      throw new Error("Resource not found: " + url)
    }
    body = await response.text()
    m.cr = { resource: jsyaml.load(body) }
    if (!m.cr.resource.metadata.namespace) {
      m.cr.resource.metadata.namespace = 'kyma-system'
    }
  }
}
async function releaseChannels() {
  let tasks = []
  for (let ch of channels) {
    tasks.push(releaseChannel(ch))
  }
  await Promise.all(tasks)
}

async function releaseChannel(ch) {
    for (let mod of ch.modules) {
      console.log(ch.name,':', mod.name)
      for (let m of modules) {
        if (m.name == mod.name) {
          mod.deploymentYaml = m.deploymentYaml
          mod.crYaml = m.crYaml
          mod.managedResources = m.managedResources
          mod.documentation = m.documentation
          mod.repository = m.repository
          mod.resources = m.resources
          mod.cr = m.cr
          mod.community = m.community
          mod.manageable = m.manageable
          for (let v of m.versions) {
            if (mod.version == v.version) {
              if (v.managedResources) {
                mod.managedResources = v.managedResource
              }
              if (v.deploymentYaml) {
                mod.deploymentYaml = v.deploymentYaml
              }
              if (v.crYaml) {
                mod.crYaml = v.crYaml
              }
              if (v.documentation) {
                mod.documentation = v.documentation
              }
              if (v.repository) {
                mod.repository = v.repository
              }
              if (v.resources) {
                mod.resources = v.resources
              }
              if (v.cr) {
                mod.cr = v.cr
              }
            }
          }
        }
      }
      await loadModule(mod)
    }
    fs.writeFileSync(`${ch.name}.json`, JSON.stringify(ch.modules, null, 2))
    console.log("channel written:", `${ch.name}.json`)
    return 'ok'
}

releaseChannels();