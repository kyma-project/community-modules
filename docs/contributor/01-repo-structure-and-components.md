# Repository Structure and Components

Learn more about the repository structure and key elements.

## Repository Structure

This is the structure of the `/community-module` repository:

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

## ModuleTemplate Custom Resources

A ModuleTemplate is a Kubernetes custom resource (`operator.kyma-project.io/v1beta2`) that defines a module. A ModuleTemplate describes:

- Module metadata and visual assets
- The module manager resource for health tracking (**spec.manager**)
- Default CR to bootstrap the module (**spec.data**)
- Module version 

For more information, see [ModuleTemplate](https://github.com/kyma-project/lifecycle-manager/blob/main/docs/contributor/resources/03-moduletemplate.md).

### Example

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

## Community Module Catalog

All ModuleTemplate CRs are aggregated and published as:

- [all-modules.yaml](https://kyma-project.github.io/community-modules/all-modules.yaml)
- [all-modules.json](https://kyma-project.github.io/community-modules/all-modules.json)

These endpoints are consumed by Kyma dashboard to render a catalog of installable community modules.

> [!TIP]
> You can use `all-modules.yaml` or `all-modules.json` to install all modules at once:
>
>   ```bash
>   kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
>   ```
