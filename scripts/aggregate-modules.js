// Aggregate and validate all module templates from modules/ into all-modules.json
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const yaml = require('js-yaml');

const MODULES_DIR = path.join(__dirname, '../modules');
const OUTPUT_FILE = path.join(__dirname, '../public/all-modules.json');

function validateModule(obj, file) {
  if (!obj || typeof obj !== 'object') throw new Error(`${file}: Not a valid YAML object`);
  if (!obj.apiVersion) throw new Error(`${file}: Missing apiVersion`);
  if (!obj.kind) throw new Error(`${file}: Missing kind`);
  if (!obj.metadata || !obj.metadata.name) throw new Error(`${file}: Missing metadata.name`);
  
}

function addSourceAnnotations(obj, file) {
  if (!obj.metadata) obj.metadata = {};
  if (!obj.metadata.labels) obj.metadata.labels = {};
  if (!obj.metadata.annotations) obj.metadata.annotations = {};
  // Add an annotation to indicate the source of the module (annotations don't have size limits)
  obj.metadata.annotations['source'] = 'https://kyma-project.github.io/community-modules/all-modules.yaml';
  // Add a timestamp label for tracking when the module was last updated
  obj.metadata.annotations['lastUpdated'] = new Date().toISOString();
  return obj;
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
      doc = addSourceAnnotations(doc, file);
      modules.push(doc);
    } catch (e) {
      console.error(`Validation failed for ${file}:`, e.message);
      process.exit(1);
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(modules, null, 2));
  // Write all modules as YAML documents separated by '---'
  const yamlOutput = modules.map(m => yaml.dump(m)).join('---\n');
  fs.writeFileSync(path.join(__dirname, '../public/all-modules.yaml'), yamlOutput);
  console.log(`Aggregated ${modules.length} modules to all-modules.json and all-modules.yaml`);
}

main();
