# Kyma Community Modules

## Overview

The community modules are modules provided by the Kyma community and can be installed alongside the managed modules. They are not automatically updated or maintained, but they can be used to enhance your Kyma experience with additional features and capabilities.

## Quick Install

<!-- tabs:start -->

#### **Kyma Dashboard**

1. Go to your Kyma dashboard and select **Modify Modules**.

2. In the **Community Modules** section, select **Add** and mark the modules you want to install.

3. Select **Add**.

Your module is installed, when its status changes to `Ready`.

To delete your module, select the trash icon next to the module name.

#### **Kyma CLI**

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

#### **kubectl**

1. Install the ModuleTemplare CustomResourceDefinition (CRD):

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kyma-project/lifecycle-manager/refs/heads/main/config/crd/bases/operator.kyma-project.io_moduletemplates.yaml
   ```

2. Install all community modules:

   ```bash
   kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
   ```
   <!-- tabs:end -->