const jsyaml = require('js-yaml')
const fs = require('fs')
const channels = require('../app/channels.json')

async function loadModules(modules) {
  for (let m of modules) {
    let url = m.deploymentYaml
    let response = await fetch(url)
    let body = await response.text()
    m.resources = []
    jsyaml.loadAll(body, (doc) => {
      m.resources.push({ resource: doc })
    });

    url = m.crYaml
    response = await fetch(url)
    body = await response.text()
    m.cr = { resource: jsyaml.load(body) }
    m.cr.resource.metadata.namespace='kyma-system'
  }
}

async function releaseChannels(){
  for(let ch of channels) {
    await loadModules(ch.modules)
    console.log("channel loaded")
    fs.writeFileSync(`${ch.name}.json`,JSON.stringify(ch.modules,null,2))
    console.log("channel written")
  }
}

releaseChannels();