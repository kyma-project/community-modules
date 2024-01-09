const KYMA_PATH = '/apis/operator.kyma-project.io/v1beta2/namespaces/kyma-system/kymas/default'

async function installedManagers(modules, client) {
  let paths = {}
  for (let m of modules) {
    for (let v of m.versions) {
      paths[v.managerPath] = client.get(v.managerPath)
      paths[v.crPath] = client.get(v.crPath)
    }
  }
  await Promise.allSettled(Object.values(paths))
  for (let m of modules) {
    m.available = false
    m.managerImage = undefined
    m.actualVersion = undefined
    for (let v of m.versions) {
      let cr = await paths[v.crPath]
      if (cr) {
        m.config = cr
      }

      let manager = await paths[v.managerPath]
      if (manager && manager.kind == 'Deployment') {
        if (manager.spec.template.spec.containers.length == 1) {
          m.managerImage = manager.spec.template.spec.containers[0].image
        } else {
          for (let c of manager.spec.template.spec.containers) {
            if (!c.image.indexOf('proxy') >= 0) {
              m.managerImage = c.image
            }
          }
        }
        if (m.managerImage == v.managerImage) {
          m.actualVersion = v.version
        }
        if (manager.status && manager.status.conditions) {
          let av = manager.status.conditions.find(c => c.type == 'Available')
          if (av && av.status == "True") {
            m.available = true
          }
        }
      }
    }
  }
  return modules
}

async function managedModules(modules, client) {
  let kyma = await client.get(KYMA_PATH)
  if (kyma) {
    for (let m of modules) {
      if (kyma.spec.modules) {
        let mm = kyma.spec.modules.find((mod) => mod.name == m.name)
        if (mm) {
          m.managed = true
          m.channel = mm.channel || kyma.spec.channel
        } else {
          m.managed = false
          m.channel = undefined
        }
      }
    }
  } else {
    for (let m of modules) {
      m.manageable = false
    }
  }
  return modules
}


export {installedManagers, managedModules}