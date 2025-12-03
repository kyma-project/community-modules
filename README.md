# Kyma Community Modules

Modules are independent, composable building blocks that extend Kyma functionality. Each module typically provides:

- A Kubernetes operator (manager)
- A default configuration custom resource (CR)
- Optional metadata, documentation, and versioning

This repository contains ModuleTemplate CRs for modules contributed by the Kyma community. You can install community modules in Kyma clusters using Kyma dashboard, Kyma CLI, or kubectl. Community modules offer flexibility and innovation beyond the fully-managed modules offered SAP BTP, Kyma runtime. For more information, see [Community Modules](./docs/user/README.md) in `/docs/user`.

For more information on managed SAP BTP, Kyma runtime, see [Kyma Environment](https://help.sap.com/docs/btp/sap-business-technology-platform/kyma-environment?version=Cloud).

## Known Limitations

- Community modules aren't subject to the Service Level Agreement (SLA).
- Incompatible or invalid ModuleTemplates may break during rendering in Kyma dashboard.
- Some community modules may require additional configuration or permissions.

## Contributing

We welcome community module contributions! To contribute, follow these steps:

1. Fork the repository.
2. Create a folder under `modules/your-module-name/`.
3. Add a valid `moduletemplate.yaml` based on the `v1beta2` spec. For more information, see [`moduletemplate_types.go`](https://github.com/kyma-project/lifecycle-manager/blob/main/config/crd/bases/operator.kyma-project.io_moduletemplates.yaml).
4. Open a pull request with a short description.

For standard contribution rules, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing

See the [LICENSE file](./LICENSE).
