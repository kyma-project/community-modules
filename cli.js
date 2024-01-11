#!/usr/bin/env node

import modules from './model.js'
import { program, Option } from 'commander'
import proxy from 'express-http-proxy';
import express from 'express';
import open from 'open';
import path from 'path';
import * as url from 'url';
import k8sClient from '@kubernetes/client-node'
import { Agent } from 'undici';
import { Client } from './k8s.js'
import { installedManagers, managedModules } from './module-management.js'
import { table } from 'table'
import { BtpClient } from './btp.js';
import { platform } from 'os';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function defaultClient() {
  let kc = new k8sClient.KubeConfig();
  kc.loadFromDefault();
  const opts = {};
  kc.applyToRequest(opts);
  opts.dispatcher = new Agent({
    connect: {
      ...opts,
      rejectUnauthorized: false,
    }
  })
  return new Client(kc.getCurrentCluster().server, opts)
}
function platformInstances(gas) {
  let platforms = []
  let clusters = []
  for (let ga of gas) {
    for (let sa of ga.sAccounts) {
      for (let si of sa.instances) {
        let plan = sa.plans.find(p => p.id == si.service_plan_id)
        if (plan) {
          si.service_offering_name = plan.service_offering_name
          si.catalog_name = plan.catalog_name
        }
        if (si.catalog_name == 'service-operator-access') {
          si.clusters = []
          platforms.push(si)
        }
        if (si.context && si.context.clusterid) {
          clusters.push({ platform_id: si.platform_id, clusterid: si.context.clusterid })
        }
        si.bindings = []
        for (let bi of sa.bindings) {
          if (bi.service_instance_id == si.id) {
            si.bindings.push(bi)
            si.binding = bi
          }
        }

      }
    }
  }
  for (let cluster of clusters) {
    let platform = platforms.find(p => p.id == cluster.platform_id)
    if (platform) {
      if (!platform.clusters.find(id => id == cluster.clusterid)) {
        platform.clusters.push(cluster.clusterid)
      }
    }
  }
  return platforms
}

function btpDump(gas) {
  let platforms = platformInstances(gas)
  for (let ga of gas) {
    console.group('global account:', ga.displayName)
    for (let sa of ga.sAccounts) {
      console.group('sub account:', sa.displayName)
      for (let si of sa.instances) {
        console.group('instance:', si.name, si.service_offering_name || '', si.catalog_name || '')
        for (let bi of si.bindings) {
          console.log('binding:', bi.name)
        }
        console.groupEnd()
      }
      console.groupEnd()
    }
    console.groupEnd()
  }
  logPlatforms(platforms)
}
function logPlatforms(platforms) {
  console.group('platforms:')
  for (let p of platforms) {
    console.group(p.name, `id: ${p.id}`)
    console.log('global account:', p.context.global_account_id)
    console.log('subaccount:', p.subaccount_id)
    console.log('clusterId:', p.clusters.join(', '))
    console.log('credentials:', p.binding ? 'ok' : '')
    console.groupEnd()
  }
  console.groupEnd()
}
let btp = program.command('btp')

function createPlatformSecret(platform) {
  let cred = platform.binding.credentials
  let secret = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: 'sap-btp-manager',
      namespace: 'kyma-system',
      labels: {
        'app.kubernetes.io/managed-by': 'kcp-kyma-environment-broker'
      }
    },
    data: {
      'clientid': Buffer.from(JSON.stringify(cred.clientid)).toString('base64'),
      'clientsecret': Buffer.from(JSON.stringify(cred.clientsecret)).toString('base64'),
      'sm_url': Buffer.from(JSON.stringify(cred.sm_url)).toString('base64'),
      'tokenurl': Buffer.from(JSON.stringify(cred.url)).toString('base64'),
      'cluster_id': Buffer.from(JSON.stringify(platform.clusters[0])).toString('base64')
    }
  }
  return secret
}
btp.command('services')
  .argument('<dump_filename>', 'json file with dump of BTP services (see btp dump)')
  .action(async function () {
    let fs = await import('fs')
    let gas = JSON.parse(fs.readFileSync(this.args[0]).toString())
    btpDump(gas)
  })

btp.command('attach')
  .option('-ga, --global-account <string>', 'global account')
  .option('-sa, --sub-account <string>', 'sub account')
  .option('--from-file <filename>','json file with dump of BTP services (see btp dump)')
  .option('--platform <string>', 'platform id, you can skip it if only one platform is available')
  .action(async function () {
    let gas
    if (this.opts().fromFile) {
      let fs = await import('fs')
      gas = JSON.parse(fs.readFileSync(this.opts().fromFile).toString())
    } else {
      let client = new BtpClient()
      let { id, url } = client.ssoUrl()
      console.log("Please login to your BTP account using this URL:", url)
      open(url)
      let account = await client.sso(id)
      console.log("Logged in as:", account.user)
      gas = await client.dump(this.opts())  
    }
    let platforms = platformInstances(gas)
    if (this.opts().platform) {
      platforms = platforms.filter(p => p.id == this.opts().platform)
    }
    if (platforms.length == 0) {
      console.error("no platforms found")
      return
    }
    if (platforms.length > 1) {
      console.error("multiple platforms found, please specify platform id")
      logPlatforms(platforms)
      return
    }
    if (!platforms[0].binding) {
      console.error("no binding found for platform", platforms[0].name)
      logPlatforms([platforms[0]])
      return
    }
    console.log('connecting to platform ', platforms[0].name)
    let btpPlatformSecret = createPlatformSecret(platforms[0])
    let clientK8s = defaultClient()    
    await clientK8s.apply(btpPlatformSecret)
    console.log('secret:\n', JSON.stringify(createPlatformSecret(platforms[0]),null,2))
  })



btp.command('dump')
  .argument('<filename>', 'filename to dump to')
  .option('-ga, --global-account <string>', 'global account to dump')
  .option('-sa, --sub-account <string>', 'sub account to dump')
  .action(async function () {
    let client = new BtpClient()
    let { id, url } = client.ssoUrl()
    console.log("Please login to your BTP account using this URL:", url)
    open(url)
    let account = await client.sso(id)
    console.log("Logged in as:", account.user)
    let gas = await client.dump(this.opts())
    btpDump(gas)
    let fs = await import('fs')
    fs.writeFileSync(this.args[0], JSON.stringify(gas, null, 2))
  })
program.command('ns')
  .description('get namespaces')
  .action(async () => {
    let client = defaultClient()
    client.get('/api/v1/namespaces')
      .then((json) => {
        console.log(json.items.map(ns => ns.metadata.name).join('\n'))
      });

  })

program.command('modules')
  .description('list modules')
  .option('-c, --channel <string>')
  .action(async function () {
    let client = defaultClient()
    let filtered = modules.filter(filterFunc(this.opts()))
    await installedManagers(filtered, client)
    await managedModules(filtered, client)
    managedTable(filtered)
    userTable(filtered)
    availableTable(filtered)
  })
program.command('version')
  .description('show version')
  .action(async () => {
    const { default: info } = await import("./package.json", {
      assert: {
        type: "json",
      },
    });
    console.log(info.version)
  })
function configState(m) {
  if (!m.config) {
    return 'Not configured'
  }
  if (!m.config.status || !m.config.status.state) {
    return 'Applied'
  }
  return m.config.status.state

}

function managedTable(modules) {
  let list = modules.filter(m => m.managed)
  if (list.length > 0) {
    console.log("Managed modules")
    let data = [['name', 'channel', 'version', 'manager', 'ready', 'config']]
    list.forEach(m => {
      let image = m.managerImage ? m.managerImage.split('/')[m.managerImage.split('/').length - 1] : ''
      data.push([m.name, m.channel || '', m.actualVersion || '', image, m.available, configState(m)])
    })
    console.log(table(data))

  }
}
function userTable(modules) {
  let list = modules.filter(m => !m.managed && m.actualVersion)
  if (list.length > 0) {
    console.log("User modules")
    let data = [['name', 'version', 'manager', 'ready', 'config']]
    list.forEach(m => {
      let image = m.managerImage ? m.managerImage.split('/')[m.managerImage.split('/').length - 1] : ''
      data.push([m.name, m.actualVersion || '', image, m.available, configState(m)])
    })
    console.log(table(data))
  }
}
function availableTable(modules) {
  console.log("Available modules")
  let data = [['name', 'versions']]
  modules.forEach(m => {
    data.push([m.name, moduleVersions(m)])
  })
  console.log(table(data))
}

program.command('deploy')
  .description('deploy modules')
  .option('-m, --modules <name:version...>'
    , 'install one or more modules; put :<version> after module name to specify version'
    , ["istio", "api-gateway", "btp-operator"])
  .option('-c, --channel <string>', 'use module version from channel')
  .option('--customConfig', 'do not apply default module configuration (CR)')
  .option('--dry-run', 'do not actually deploy')
  .action(async function () {
    for (let module of this.opts().modules) {
      let { m, v } = findModuleVersion(module, this.opts().channel, modules)
      if (!v) {
        console.error("module not found", module)
        process.exit(1)
      }
      else {
        await applyModuleResource(m, v, this.opts())
      }
    }
  })

program.command('ui')
  .description('start web interface')
  .option('-p, --port <number>', 'port to listen on', 3000)
  .action(ui)

program.parse()

function moduleVersions(m) {
  return m.versions.map(v => {
    return v.channels ? v.version + ' (' + v.channels.join(', ') + ')' : v.version
  }).join(', ')
}

function ui() {
  console.log("starting ui on port", this.opts().port)

  var app = express();

  let kc = new k8sClient.KubeConfig();
  kc.loadFromDefault();

  app.use('/backend', proxy(kc.getCurrentCluster().server, {
    proxyReqOptDecorator: function (proxyReqOpts, originalReq) {
      proxyReqOpts.rejectUnauthorized = false
      kc.applyToRequest(proxyReqOpts)
      return proxyReqOpts;
    }
  }));

  app.use(express.static(path.resolve(__dirname, "dist")))
  app.listen(this.opts().port);
  open('http://localhost:' + this.opts().port);

}

function findModuleVersion(module, channel, modules) {
  if (module.includes(':')) {
    let version = module.split(':')[1]
    let name = module.split(':')[0]
    let m = modules.find(m => m.name == name)
    for (let v of m.versions) {
      if (v.version == version) {
        return { m, v }
      }
    }
    return {}
  } else {
    let m = modules.find(m => m.name == module)
    if (channel) {
      let v = m.versions.find(v => v.channels && v.channels.includes(channel))
      if (v) {
        return { m, v }
      }
    }
    return { m, v: m.versions[m.versions.length - 1] }
  }
}

function filterFunc(options) {
  return (m) => {
    let ok = true
    if (options.channel) {
      ok = m.versions.find(v => v.channels && v.channels.includes(options.channel))
    }
    return ok
  }
}

async function applyModuleResource(m, v, opts) {
  let client
  if (!opts.dryRun) {
    client = defaultClient()
  }
  if (v.deploymentYaml) {
    console.log('kubectl apply -f ' + v.deploymentYaml)
    if (!opts.dryRun) {
      for (let r of v.resources) {
        await client.apply(r)
      }
    }
  } else {
    console.log("no deployment YAML found for module", module)
  }
  if (!opts.customConfig) {
    if (v.crYaml) {
      console.log('kubectl apply -f ' + v.crYaml)
      if (!opts.dryRun) {
        await client.apply(v.cr)
      }
    } else {
      console.log("no default CR YAML found for module", module)
    }
  }

}

