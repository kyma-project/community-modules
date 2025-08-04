# Kyma Community Modules

This repository contains `ModuleTemplate` definitions for modules contributed by the Kyma community. These modules can be installed in Kyma clusters using the Kyma Dashboard (Busola). Community modules offer flexibility and innovation beyond the fully-managed SAP Kyma Runtime offerings.

> **📢 Goal:** Provide a consistent, transparent, and user-friendly way to discover and install community modules directly in your cluster using Kyma Dashboard.

---

## 🌱 What Are Modules?

Modules are independent, composable building blocks that extend Kyma functionality. Each module typically provides:

- A **Kubernetes operator (manager)**
- A **default configuration custom resource (CR)**
- Optional metadata, documentation, and versioning

Kyma supports two main types of modules:

| Type                | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **Managed Modules** | Fully supported in SAP BTP Kyma Runtime with automatic updates via KLM      |
| **Community Modules** | Open-source, manually installed modules contributed and maintained by the community |

---

## 📦 Repository Structure

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

## 🧭 Installation Scenarios

Kyma Dashboard (Busola) helps you install modules with a consistent experience tailored to your cluster type and preferences:

### ✅ In Managed Kyma Runtime (SAP BTP):
- **Preferred method:** Add managed module entries to the Kyma custom resource (CR) → KLM installs and maintains them
- **Community modules:** Install manually with `kubectl apply` or via Dashboard UI
- **Opt-out mode:** Manually install manageable modules (not recommended, marked as "Advanced")

### ✅ In Open-source Kyma / Local Clusters (e.g., k3s, Minikube):
- Install **all modules manually**, including manageable ones
- Use Kyma Dashboard to apply ModuleTemplates and install operators
- No KLM is involved; upgrades and deletions are fully manual

📘 For more background, see:  
[Kyma Lifecycle Manager](https://github.com/kyma-project/lifecycle-manager)

---

## 🧩 Module Lifecycle Overview

| Phase      | Managed Module (via KLM)            | Community / Manual Module                |
|------------|--------------------------------------|------------------------------------------|
| **Install**| Add to `Kyma` CR → auto-installed   | Apply `module-a-0.1.0.yaml` with UI or CLI |
| **Upgrade**| Automatic with version drift detection | Re-apply manifest manually when new version is available |
| **Delete** | Remove from `Kyma` CR               | Delete CRs, then remove operator with UI/CLI |
| **Status** | Visible in `Kyma` CR .status and .spec.modules | Based on CR and manager resource status |

⚠️ Deletion Safety: ModuleTemplate should declare `associatedResources` to ensure all managed CRs are cleaned before uninstalling the operator. Kyma Dashboard guides users through this safely.

---

## 📄 ModuleTemplate Specification

The `ModuleTemplate` is a Kubernetes Custom Resource (`operator.kyma-project.io/v1beta2`) that describes:

- Module metadata and visual assets
- Manager resource for health tracking
- Default CR to bootstrap the module
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

## 🌐 GitHub Pages Integration

All `ModuleTemplate` CRs are aggregated and published as:

- [🔗 all-modules.yaml](https://kyma-project.github.io/community-modules/all-modules.yaml)
- [🔗 all-modules.json](https://kyma-project.github.io/community-modules/all-modules.json)

These endpoints are consumed by Kyma Dashboard to render a catalog of installable community modules.

You can also use these files to install all modules at once:

```bash
kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
```

---

## 📥 How to Contribute

We welcome community module contributions! Follow these steps:

1. Fork this repository
2. Create a folder under `modules/your-module-name/`
3. Add a valid `moduletemplate.yaml` (based on `v1beta2` spec)
4. Open a pull request with a short description

📘 See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed instructions and validation tips (using [`modulectl`](https://github.com/kyma-project/modulectl)).

---

## 📌 Known Limitations

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
