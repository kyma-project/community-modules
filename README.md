# Kyma Community Modules

This repository contains `ModuleTemplate` definitions for modules contributed by the Kyma community. These modules can be installed in Kyma clusters using the Kyma Dashboard (Busola). Community modules offer flexibility and innovation beyond the fully-managed SAP Kyma Runtime offerings.

## Quick start

Install ModuleTemplare CRD:
```
kubectl apply -f https://raw.githubusercontent.com/kyma-project/lifecycle-manager/refs/heads/main/config/crd/bases/operator.kyma-project.io_moduletemplates.yaml
```

Install all community modules:
```
kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
```
Now you can see the modules in the Kyma Dashboard (Busola) under "Modules" section or use Kyma CLI to manage them (see [kyma module command](https://github.com/kyma-project/cli/blob/main/docs/user/gen-docs/kyma_module.md))

---

## What Are Modules?

Modules are independent, composable building blocks that extend Kyma functionality. Each module typically provides:

- A **Kubernetes operator (manager)**
- A **default configuration custom resource (CR)**
- Optional metadata, documentation, and versioning

Community modules are contributed by the Kyma community and can be installed alongside managed modules provided by SAP. Community modules are not automatically updated or maintained by SAP, but they can be used to enhance your Kyma experience with additional features and capabilities.

---

## Repository Structure

```
community-modules/
│
├── modules/
│   ├── module-a/
│   │   └── module-a-0.1.0.yaml
│   └── module-b/
│       └── module-b-1.2.0.yaml
│
├── .github/
│   └── workflows/
│       └── publish.yaml       # GitHub Action to bundle all templates for GitHub Pages
│
├── docs/
│   └── CONTRIBUTING.md        # How to contribute your own module
│
├── .gitignore
└── README.md
```

---


## 📄 ModuleTemplate Specification

The `ModuleTemplate` is a Kubernetes Custom Resource (`operator.kyma-project.io/v1beta2`) that describes:

- Module metadata and visual assets
- Manager resource for health tracking (spec.manager)
- Default CR to bootstrap the module (spec.data)
- Version 

See: [ModuleTemplate Reference](https://github.com/kyma-project/lifecycle-manager/blob/main/docs/contributor/resources/03-moduletemplate.md)

### Example Template Fields

```yaml
spec:
  moduleName: my-module
  manager:
    group: apps
    version: v1
    kind: Deployment
    name: my-module-operator
    namespace: my-module-system
  data:
    apiVersion: example/v1
    kind: MyModule
    metadata:
      name: my-module
  info:
    repository: https://github.com/example/my-module
    documentation: https://docs.example.com
    icons:
    - name: logo
      link: https://example.com/icon.png
```

---

## Community Module Catalog

All `ModuleTemplate` CRs are aggregated and published as:

- [🔗 all-modules.yaml](https://kyma-project.github.io/community-modules/all-modules.yaml)
- [🔗 all-modules.json](https://kyma-project.github.io/community-modules/all-modules.json)

These endpoints are consumed by Kyma Dashboard to render a catalog of installable community modules.

You can also use these files to install all modules at once:

```bash
kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
```

---

## How to Contribute

We welcome community module contributions! Follow these steps:

1. Fork this repository
2. Create a folder under `modules/your-module-name/`
3. Add a valid `moduletemplate.yaml` (based on `v1beta2` spec)
4. Open a pull request with a short description

---

## Known Limitations

- No SLA or upgrade guarantees for community modules
- Incompatible or invalid templates may break during Dashboard rendering
- Some modules may require additional configuration or permissions


## Contributing

For standard contribution rules see [CONTRIBUTING.md](CONTRIBUTING.md).

## Code of Conduct
<!--- mandatory section - do not change this! --->

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing
<!--- mandatory section - do not change this! --->

See the [LICENSE file](./LICENSE).
