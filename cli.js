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
import {ServiceManager} from './service-manager.js'

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
          si.global_account_name = ga.displayName
          si.subaccount_name = sa.displayName
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
    console.log('global account:', p.global_account_name, '(', p.context.global_account_id, ')')
    console.log('subaccount:', p.subaccount_name, '(', p.subaccount_id, ')')
    console.log('clusterId:', p.clusters.join(', '))
    console.log('credentials:', p.binding ? 'ok' : '')
    console.groupEnd()
  }
  console.groupEnd()
}

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
      'clientid': Buffer.from(cred.clientid).toString('base64'),
      'clientsecret': Buffer.from(cred.clientsecret).toString('base64'),
      'sm_url': Buffer.from(cred.sm_url).toString('base64'),
      'tokenurl': Buffer.from(cred.url).toString('base64'),
      'cluster_id': Buffer.from(platform.clusters[0]).toString('base64')
    }
  }
  return secret
}
async function globalAccounts(opts) {
  if (opts.fromFile) {
    let fs = await import('fs')
    return JSON.parse(fs.readFileSync(opts.fromFile).toString())
  } else {
    let client = new BtpClient(opts)
    let { id, url } = client.ssoUrl()
    console.log("Please login to your BTP account using this URL:", url)
    open(url)
    let account = await client.sso(id)
    console.log("Logged in as:", account.user)
    return await client.dump(opts)
  }

}
function smToK8s(instances) {
  let resources = []
  for (let si of instances) {
    let res = {
      apiVersion: 'services.cloud.sap.com/v1',
      kind: 'ServiceInstance',
      metadata: {
        name: si.name,
        namespace: si.context.namespace
      },
      spec: {
        serviceOfferingName: si.offering_name,
        servicePlanName: si.plan_name,
      }
    }
    resources.push(res)
    for (let bi of si.bindings) {
      res = {
        apiVersion: 'services.cloud.sap.com/v1',
        kind: 'ServiceBinding',
        metadata: {
          name: bi.name,
          namespace: si.context.namespace
        },
        spec: {
          serviceInstanceName: si.context.instance_name,
        }
      }
      resources.push(res)
    }
  }
  return resources
}
function missingNamespaces(resources, namespaces) {
  let missing = {}
  for (let r of resources) {
    if (!namespaces.find(ns => ns.metadata.name == r.metadata.namespace)) {
      missing[r.metadata.namespace] = true
    }
  }
  return Object.keys(missing).map(ns => { return { apiVersion: 'v1', kind: 'Namespace', metadata: { name: ns } } })

}

program.command('restore-services')
  .description('restore BTP services instances and binding from the attached btp platform')
  .addOption(new Option('-l, --landscape <landscape>', 'live or canary').choices(['live', 'canary']))
  .option('-ga, --global-account <string>', 'global account')
  .option('-sa, --sub-account <string>', 'sub account')
  .option('--from-file <filename>', 'json file with dump of BTP services (see btp-dump command)')
  .action(async function () {
    let clientK8s = defaultClient()
    let btpPlatformSecret = await clientK8s.get('/api/v1/namespaces/kyma-system/secrets/sap-btp-manager')
    if (!btpPlatformSecret) {
      console.error("Platform secret not found. Please attach your cluster to the BTP platform first using the 'attach' command")
      return
    }
    let btpCR = await clientK8s.get('/apis/operator.kyma-project.io/v1alpha1/namespaces/kyma-system/btpoperators/btpoperator')
    if (!btpCR) {
      console.error("BTP operator CR not found. Please install BTP operator first using the 'deploy' command")
      return
    }
    if (!btpCR.status || !btpCR.status.state || btpCR.status.state != 'Ready') {
      console.error("BTP operator not ready. Please wait until BTP operator is ready")
      return
    }
    let sm = new ServiceManager(btpPlatformSecret)
    await sm.authenticate()
    let si = await sm.serviceInstances()
    let resources = smToK8s(si)
    let namespaces = await clientK8s.get('/api/v1/namespaces')
    let missing = missingNamespaces(resources, namespaces.items)
    for (let r of missing) {
      await clientK8s.apply(r)
    }
    for (let r of resources) {
      let path = await clientK8s.resPath(r)
      let exists = await clientK8s.get(path)
      if (exists) {
        console.log(r.kind, r.metadata.name, 'already exists')
      } else {
        await clientK8s.apply(r)
      }
    }
  })

program.command('attach')
  .description('attach your cluster to the BTP platform. It requires BTP subaccount with "service-manager" service instance and binding with plan "service-operator-access"')
  .addOption(new Option('-l, --landscape <landscape>', 'live or canary').choices(['live', 'canary']))
  .option('-ga, --global-account <string>', 'global account')
  .option('-sa, --sub-account <string>', 'sub account')
  .option('--from-file <filename>', 'json file with dump of BTP services (see btp-dump command)')
  .option('--platform <string>', 'platform id, you can skip it if only one platform is available')
  .action(async function () {
    let gas = await globalAccounts(this.opts())
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
    console.log(`platform secret ${btpPlatformSecret.metadata.name} created in the namespace ${btpPlatformSecret.metadata.namespace}`)
  })



program.command('btp-dump')
  .description('dump BTP services from your accounts to the json file')
  .argument('<filename>', 'filename to dump to')
  .addOption(new Option('-l, --landscape <landscape>', 'live or canary').choices(['live', 'canary']))
  .option('-ga, --global-account <string>', 'global account to dump')
  .option('-sa, --sub-account <string>', 'sub account to dump')
  .action(async function () {
    let client = new BtpClient(this.opts())
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

