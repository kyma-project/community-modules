const jsyaml = require('js-yaml')
const fs = require('fs')
const channels = require('../app/channels.json')

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
        m.version = r.resource.spec.template.spec.containers[0].image
        break;
      }
    }
    url = m.crYaml
    if (url) {
      response = await fetch(url)
      body = await response.text()
      m.cr = { resource: jsyaml.load(body) }
      if (!m.cr.resource.metadata.namespace) {
        m.cr.resource.metadata.namespace = 'kyma-system'
      }  
    }
}

async function releaseChannels() {
  for (let ch of channels) {
    for (let m of ch.modules) {
      if (ch.base) {
        let baseChannel = channels.find((c)=> c.name==ch.base)
        let baseModule = baseChannel.modules.find((mod)=>mod.name==m.name)
        if (!m.documentation) {
          m.documentation=baseModule.documentation
        }
        if (!m.repository) {
          m.repository=baseModule.repository
        }
        if (!m.managedResources) {
          m.managedResources=baseModule.managedResources
        } 
        if (!m.cr) {
          m.cr = baseModule.cr
        }
        if (!m.resources) {
          m.resources = baseModule.resources
        }
      }
      await loadModule(m)
    }
    console.log("channel loaded:",ch.name)
    fs.writeFileSync(`${ch.name}.json`, JSON.stringify(ch.modules, null, 2))
    console.log("channel written:",`${ch.name}.json`)
  }
}

releaseChannels();