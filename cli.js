#!/usr/bin/env node

import { exec } from "child_process"
import modules from './model.js'
import { program, Option } from 'commander'
import proxy from 'express-http-proxy';
import express from 'express';
import open from 'open';
import path from 'path';
import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

program.command('modules')
  .description('list modules')
  .option('-c, --channel <string>')
  .action((options) => {

    console.log(modules.filter(filterFunc(options)).map(m => `${m.name}: ${moduleVersions(m)}`).join('\n'))
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
program.command('deploy')
  .description('deploy modules')
  .option('-c, --channel <string>','use module version from channel')
  .option('--defaultConfig','apply default configuration', true)
  .option('-m, --modules <name:version...>'
    , 'install one or more modules; put :<version> after module name to specify version'
    , ["istio", "api-gateway"])
  .action(async function () {
    for (let module of this.opts().modules) {
      let {m,v} = findModuleVersion(module, this.opts().channel, modules)
      if (!v) {
        console.error("module not found", module) 
        process.exit(1)
      }
      else {
        if (v.deploymentYaml) {          
          await command('kubectl apply -f '+v.deploymentYaml, this.opts())
        } else {
          console.log("no deployment YAML found for module", module)
        }            
        if (this.opts().defaultConfig && v.crYaml) {
          await command('kubectl apply -f '+v.crYaml, this.opts())
        } 
      }
    }
  })
// Add common options after setting up program and subcommands
program.commands.forEach((cmd) => {
  cmd.addOption(new Option('-o, --output <json|yaml>', 'output format').choices(['json', 'yaml']))
  cmd.option('--dry-run', 'do not actually deploy');
});
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

function ui(){
  console.log("starting ui on port", this.opts().port)

  var app = express();
  exec("kubectl proxy", (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);    
  })
  app.use('/backend', proxy('127.0.0.1:8001'));
  app.use(express.static(path.resolve(__dirname,"dist")))
  app.listen(this.opts().port);
  open('http://localhost:'+this.opts().port+'?api=backend');
  
}

function findModuleVersion(module, channel, modules ) {
  if (module.includes(':')) {
    let version = module.split(':')[1]
    let name = module.split(':')[0]
    let m = modules.find(m => m.name == name)
    for (let v of m.versions) {
      if (v.version == version) {
        return {m,v}
      }
    }
    return {}
  } else {
    let m = modules.find(m => m.name == module)
    if (channel) {
      let v = m.versions.find(v => v.channels && v.channels.includes(channel))
      if (v) {
        return {m,v}
      }
    }
    return {m,v:m.versions[m.versions.length - 1]}
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

function command(cmd, opts) {
  console.log(cmd)
  return new Promise((resolve, reject) => {
    if (opts.dryRun) {
      resolve()
    } else {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.log(`${error.message}`);
          reject(error)
        }
        if (stderr) {
          console.log(stderr);
          reject(stderr)
        }
        console.log(stdout);
        resolve()
      });
    }
  })
}
