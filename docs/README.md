# Kyma Community Modules

## Overview

Community modules are modules provided by the Kyma community. Use them to enhance your Kyma experience with additional features and capabilities. You can install community modules alongside managed modules. Unlike managed modules, community modules aren't automatically updated or maintained.

> [!WARNING]
> In SAP BTP, Kyma runtime community modules aren't subject to the Service Level Agreement (SLA).

## Quick Install

<!-- tabs:start -->

### **Kyma Dashboard**

1. Go to your Kyma dashboard and select **Modify Modules**.

2. In the **Community Modules** section, select **Add** and mark the modules you want to install.

3. Select **Add**.

Your module is installed once its status changes to `Ready`.

#### Next Steps

To delete your module, select the trash icon next to the module name.

### **Kyma CLI**

1. Check the list of modules that you can add:

    ```bash
    kyma module catalog
    ```

2. Add a community module:

    ```bash
    kyma module add {MODULE_NAME} --community
    ```

3. See if your module is added:

    ```bash
    kyma module list
    ```

    You should see your module on the module's list.

#### Next Steps

To delete your module, use the following command:

   ```bash
   kyma module delete {MODULE_NAME} --community
   ```

### **kubectl**

1. Install the ModuleTemplate CustomResourceDefinition (CRD):

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kyma-project/lifecycle-manager/refs/heads/main/config/crd/bases/operator.kyma-project.io_moduletemplates.yaml
   ```

2. Install all community modules:

   ```bash
   kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
   ```

#### Next Steps

To delete your modules, use the following command:

   ```bash
   kubectl 
   ```

   <!-- tabs:end -->