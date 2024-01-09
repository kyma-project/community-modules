#!/usr/bin/env node

import { exec } from "child_process"
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

program.command('ns')
  .description('get namespaces')
  .action(async () => {
    let client=defaultClient()
    client.get('/api/v1/namespaces')
      .then((json) => {
        console.log(json.items.map(ns => ns.metadata.name).join('\n'))
      });

  })

program.command('modules')
  .description('list modules')
  .option('-c, --channel <string>')
  .action(async function () {
    let client=defaultClient()
    
    await installedManagers(modules,client)
    await managedModules(modules,client)
    moduleTable(modules)
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

function moduleTable(modules) {
  let data = [['Module', 'Installed', 'Channel', 'Available versions']]
  modules.forEach(m => {  
    data.push([m.name,m.actualVersion || '' , m.managed ? m.channel:'', moduleVersions(m)])
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

