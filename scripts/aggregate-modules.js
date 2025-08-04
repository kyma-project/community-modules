// Aggregate and validate all module templates from modules/ into all-modules.json
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

const MODULES_DIR = path.join(__dirname, '../modules');
const OUTPUT_FILE = path.join(__dirname, '../all-modules.json');

function validateModule(obj, file) {
  if (!obj || typeof obj !== 'object') throw new Error(`${file}: Not a valid YAML object`);
  if (!obj.apiVersion) throw new Error(`${file}: Missing apiVersion`);
  if (!obj.kind) throw new Error(`${file}: Missing kind`);
  if (!obj.metadata || !obj.metadata.name) throw new Error(`${file}: Missing metadata.name`);
}

function main() {
  const files = glob.sync(`${MODULES_DIR}/**/*.yaml`);
  const modules = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let doc;
    try {
      doc = yaml.load(content);
      validateModule(doc, file);
      modules.push(doc);
    } catch (e) {
      console.error(`Validation failed for ${file}:`, e.message);
      process.exit(1);
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(modules, null, 2));
  console.log(`Aggregated ${modules.length} modules to all-modules.json`);
}

main();
