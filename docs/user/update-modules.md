# Update Community Modules

> [!IMPORTANT]
> **Key Distinction**: Community modules differ fundamentally from managed SAP BTP, Kyma runtime modules:
>
> - Community modules are **NOT** handled in the Kyma CR - They are managed independently and are not part of the Kyma resource specification
> - Community modules are **NOT** managed by Kyma Control Plane - The control plane does not automatically manage their lifecycle, update them, or monitor their health
> - **You** must perform all the necessary actions - Installation, updates, and removal require manual intervention
>
> Unlike managed modules, community modules aren't automatically updated or maintained. You are fully responsible for managing community modules, including keeping them updated, monitoring their health, and handling any issues that arise.

## Prerequisites

Check the available versions for your community module. Run `kyma module catalog` to list all available modules and their versions in the community modules catalog. Alternatively, you can check the [community modules catalog](https://kyma-project.github.io/community-modules/all-modules.yaml) directly.

> [!WARNING]
> Before updating a module, review the release notes and changelog for breaking changes or migration requirements. Some updates may require additional configuration or manual migration steps.

## Context

Unlike managed modules in SAP BTP, Kyma runtime, community modules are not automatically updated. Regularly update your community modules to:

- **Security**: Receive security patches and vulnerability fixes that protect your cluster and applications
- **New Features**: Access the latest functionality, improvements, and capabilities added by the community
- **Bug Fixes**: Benefit from bug fixes and stability improvements
- **Compatibility**: Ensure compatibility with newer versions of Kyma modules and other dependencies
- **Performance**: Take advantage of performance optimizations and efficiency improvements

## Procedure

You can update community modules using Kyma dashboard, Kyma CLI, or kubectl.

<!-- tabs:start -->

#### **Kyma Dashboard (Busola)**

1. Go to Kyma dashboard. The URL is in the Overview section of your subaccount.

2. Go to **Configuration** -> **Modules** and scroll down to the list of community modules to find the one you want to update, noting the current version displayed.

4. Check and install the latest ModuleTemplate custom resources (CRs).

   a. In the **Community Modules** table, choose **Add** -> **Add source YAML**. A pop-up window appears with the following details.

    * the default **Source YAML URL** (`https://kyma-project.github.io/community-modules/all-modules.yaml`) 
    * a list of ModuleTemplates that already exist in the cluster
    * a list of **ModuleTemplates to add**

   b. Choose **Add** to install any missing ModuleTemplates.

5. Update your module.

   a. Go back to the modules list view and switch to the **Edit** tab.

   b. Scroll down to the **Community Modules** section and find the module you want to update.

   c. From the dropdown, select the latest version and choose **Save**.

6. Switch back to the **View** tab and verify the update.

   * Wait for the module status to change to `Ready`
   * Verify the version number has been updated
   * Check if the module is functioning correctly

#### **Kyma CLI**

1. Check the available module versions in the module catalog.

   ```bash
   kyma module catalog
   ```

2. Check the currently installed modules and their versions.

   ```bash
   kyma module list
   ```

3. Pull a new ModuleTemplate for the community module you want to update.

   ```bash
   kyma module pull {MODULE_NAME} --version {NEW_VERSION} --namespace {NAMESPACE}
   ```

   Replace:

   - `{MODULE_NAME}` with your module name (e.g., `cap-operator`)
   - `{NEW_VERSION}` with the target version (e.g., `0.21.0`)
   - `{NAMESPACE}` with the namespace where the ModuleTemplate should be stored (default: `default`)

   Example:
   
   ```bash
   kyma module pull cap-operator --version 0.21.0 --namespace default
   ```

4. Update the module.

   ```bash
   kyma module add {MODULE_NAME} --origin {NAMESPACE}/{MODULE_NAME}-{NEW_VERSION}
   ```

   Replace:
   - `{MODULE_NAME}` with your module name
   - `{NAMESPACE}` with the namespace where you pulled the ModuleTemplate (usually default)
   - `{NEW_VERSION}` with the new version

   Example:
   ```bash
   kyma module add cap-operator --origin default/cap-operator-0.21.0
   ```

5. Verify the update and check if your module shows the new version.

   ```bash
   kyma module list
   ```

#### **kubectl**

1. Check the vailable module versions in the module catalog.

   ```bash
   curl -s https://kyma-project.github.io/community-modules/all-modules.yaml | grep -A 5 "moduleName: {MODULE_NAME}"
   ```

   Replace `{MODULE_NAME}` with your module name.

2. Check the currently installed module version.

   ```bash
   kubectl get moduletemplate -A | grep {MODULE_NAME}
   ```

3. Apply all new ModuleTemplates.

   ```bash
   kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
   ```

   Alternatively, if you know the specific module file URL, you can pull a new ModuleTemplate only for the module you want to update:

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kyma-project/community-modules/main/modules/{MODULE_NAME}/{MODULE_NAME}-{NEW_VERSION}.yaml
   ```

   Replace:
   - `{MODULE_NAME}` with your module name
   - `{NEW_VERSION}` with the new version

   Example:

   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kyma-project/community-modules/main/modules/cap-operator/cap-operator-0.21.0.yaml
   ```

4. Install the module operator by applying the manifest referenced in the ModuleTemplate's `spec.resources.rawManifest` field:

   ```bash
   kubectl apply -f <rawManifest_URL>
   ```

5. Verify that the new ModuleTemplate exists and the module operator deployment is running.

   ```bash
   kubectl get moduletemplate -A | grep {MODULE_NAME}
   kubectl get deployment -n {MODULE_SYSTEM_NAMESPACE}
   ```

<!-- tabs:end -->