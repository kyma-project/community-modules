# Community Modules

## Overview

Community modules are modules provided by the Kyma community. Use them to enhance your Kyma experience with additional features and capabilities. You can install community modules alongside managed modules. Unlike managed modules, community modules aren't automatically updated or maintained.

> [!WARNING]
> In SAP BTP, Kyma runtime community modules aren't subject to the Service Level Agreement (SLA).

## Quick Install

<!-- tabs:start -->

#### **Kyma Dashboard**

1. Go to your Kyma dashboard and select **Modify Modules**.

2. In the **Community Modules** section, select **Add** and mark the modules you want to install.

3. Select **Add**.

Your module is installed once its status changes to `Ready`.

#### Next Steps

To delete a community module, select the trash icon next to the module's name.

#### **Kyma CLI**

1. Check the list of modules that you can add:

    ```bash
    kyma module catalog
    ```

2. Pull the ModuleTemplate:

    ```bash
    kyma module pull {MODULE_NAME} --version {module version}
    ```

    This command pulls the ModuleTemplate for the given module. You can specify the namespace where the ModuleTemplate should be stored using the `--namespace` flag (by default, the `default` namespace is used). If there are multiple versions available in the catalog, you can specify the version with `--version`.

3. Install the module by pointing to the pulled ModuleTemplate using the `--origin` flag:

    ```bash
    kyma module add {MODULE_NAME} --origin {NAMESPACE}/{MODULE_NAME}-{VERSION} --default-cr
    ```

4. See if your module is added:

    ```bash
    kyma module list
    ```

    You should see your module in the list of modules.

#### Next Steps

To delete a community module, use the following command:

   ```bash
   kyma module delete {MODULE_NAME} --community
   ```

<!-- tabs:end -->
