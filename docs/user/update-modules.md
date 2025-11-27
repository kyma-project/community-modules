# Update Community Modules

## Community Modules vs. Standard Kyma Modules

> [!IMPORTANT]
> **Key Distinction**: Community modules differ fundamentally from standard (regular) Kyma modules:
>
> - **Community modules are NOT handled in the Kyma CR** - They are managed independently and are not part of the Kyma resource specification
> - **Community modules are NOT managed by Kyma Control Plane** - The control plane does not automatically manage their lifecycle
> - **All actions are performed explicitly by the user** - Installation, updates, and removal require manual intervention
> - **Community modules are NOT part of automatic lifecycle management** - They do not benefit from automatic updates, health monitoring, or lifecycle management provided by the Kyma Control Plane
>
> This means you are fully responsible for managing community modules, including keeping them updated, monitoring their health, and handling any issues that arise.

## Why Keep Modules Up-to-Date?

Unlike managed modules in the SAP Kyma Runtime offering, community modules are not automatically updated. It's important to regularly update your community modules to:

- **Security**: Receive security patches and vulnerability fixes that protect your cluster and applications
- **New Features**: Access the latest functionality, improvements, and capabilities added by the community
- **Bug Fixes**: Benefit from bug fixes and stability improvements
- **Compatibility**: Ensure compatibility with newer versions of Kyma and other dependencies
- **Performance**: Take advantage of performance optimizations and efficiency improvements

> [!WARNING]
> Before updating a module, review the release notes and changelog for breaking changes or migration requirements. Some updates may require additional configuration or manual migration steps.

## Prerequisites

- Access to your Kyma cluster
- Appropriate permissions to modify modules
- Knowledge of the module name you want to update

## Check Available Versions

Before updating, check which versions are available for your module:

```bash
kyma module catalog
```

This command lists all available modules and their versions in the community modules catalog.

Alternatively, you can check the [community modules catalog](https://kyma-project.github.io/community-modules/all-modules.yaml) directly.

## Update Methods

You can update community modules using any of the following methods:

<!-- tabs:start -->

#### **Kyma Dashboard (Busola)**

1. **Access the Kyma Dashboard**
   - Open your Kyma Dashboard (Busola) in a web browser
   - Navigate to the **Modules** section

2. **Check Current Module Status**
   - Find the community module you want to update in the list
   - Note the current version displayed

3. **Check and Install Latest Module Templates**
   - Click the **Add** button in the **Community Modules** section
   - Click **Add source YAML**
   - You will see a list of module templates from the community repository (default YAML URL: `https://kyma-project.github.io/community-modules/all-modules.yaml`)
   - The list shows:
     - Modules that are already installed (these cannot be added again)
     - ModuleTemplates that can be added
   - If there are any ModuleTemplates to add, click the **Add** button to install the missing templates

4. **Update the Module**
   - Go back to the modules list view
   - Switch the view into **edit mode**
   - Scroll down to the **Community Modules** section
   - Find the module you want to update
   - Each module has a dropdown menu with a version selector after its name
   - Click on the dropdown for the module you want to update
   - Select the newer version from the dropdown
   - Click the **Save** button to apply the update

5. **Verify the Update**
   - Wait for the module status to change to `Ready`
   - Verify the version number has been updated
   - Check that the module is functioning correctly

#### **Kyma CLI**

1. **Check Available Versions**
   ```bash
   kyma module catalog
   ```
   Look for your module and note the available versions.

2. **Check Current Module Version**
   ```bash
   kyma module list
   ```
   This shows your currently installed modules and their versions.

3. **Pull the New ModuleTemplate**
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

4. **Update the Module**
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


5. **Verify the Update**
   ```bash
   kyma module list
   ```
   Confirm that your module shows the new version.

#### **kubectl**

1. **Check Available Versions**
   ```bash
   curl -s https://kyma-project.github.io/community-modules/all-modules.yaml | grep -A 5 "moduleName: {MODULE_NAME}"
   ```
   Replace `{MODULE_NAME}` with your module name to see available versions.

2. **Check Current Module Version**
   ```bash
   kubectl get moduletemplate -A | grep {MODULE_NAME}
   ```
   This shows the currently installed ModuleTemplate versions.

3. **Apply the New ModuleTemplate**
   ```bash
   kubectl apply -f https://kyma-project.github.io/community-modules/all-modules.yaml
   ```
   This applies all community modules, including newer versions.

   Alternatively, if you know the specific module file URL:
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

4. **Install the Module Operator**
   
   After applying the ModuleTemplate, you need to install the actual module operator by applying the manifest referenced in the ModuleTemplate's `spec.resources.rawManifest` field.
   
   First, extract the rawManifest link from the ModuleTemplate:
   ```bash
   kubectl get moduletemplate {MODULE_NAME}-{NEW_VERSION} -o yaml | grep -A 1 "name: rawManifest" | grep "link:" | awk '{print $2}'
   ```
   
   Then apply the manifest using the extracted URL:
   ```bash
   RAW_MANIFEST_URL=$(kubectl get moduletemplate {MODULE_NAME}-{NEW_VERSION} -o yaml | grep -A 1 "name: rawManifest" | grep "link:" | awk '{print $2}')
   kubectl apply -f $RAW_MANIFEST_URL
   ```
   
   Replace:
   - `{MODULE_NAME}` with your module name
   - `{NEW_VERSION}` with the new version
   
   Example:
   ```bash
   RAW_MANIFEST_URL=$(kubectl get moduletemplate cap-operator-0.21.0 -o yaml | grep -A 1 "name: rawManifest" | grep "link:" | awk '{print $2}')
   kubectl apply -f $RAW_MANIFEST_URL
   ```
   
   Alternatively, you can view the ModuleTemplate to find the rawManifest link:
   ```bash
   kubectl get moduletemplate {MODULE_NAME}-{NEW_VERSION} -o yaml
   ```
   
   Then apply the manifest directly using the URL from `spec.resources[].link` where `name: rawManifest`:
   ```bash
   kubectl apply -f <rawManifest_URL>
   ```

5. **Verify the Update**
   ```bash
   kubectl get moduletemplate -A | grep {MODULE_NAME}
   kubectl get deployment -n {MODULE_SYSTEM_NAMESPACE}
   ```
   Verify that the new ModuleTemplate exists and the module operator deployment is running.

<!-- tabs:end -->



## Related Documentation

- [Install Community Modules](README.md#quick-install)
- [ModuleTemplate Specification](../../README.md#-moduletemplate-specification)
- [Kyma CLI Module Commands](https://github.com/kyma-project/cli/blob/main/docs/user/gen-docs/kyma_module.
md)