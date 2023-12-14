# Kyma community modules


> **This repository contains an early prototype, and is not meant to be used in the production use case. Feel free to try it out, leave feedback, and report issues.**


## Overview

Install Kyma modules in your Kubernetes cluster

## Prerequisites

- kubectl
- kubernetes cluster (KUBECONFIG configured)
- kyma-system namespace created (some modules installation can fail without it)

## Installation

Download `index.html` file and save it in any folder:
```
curl https://kyma-project.github.io/community-modules/index.html -o index.html
```
Go to that folder and execute kubectl proxy command:
```
kubectl proxy -w='.'
```
Open Web UI with this link: [http://127.0.0.1:8001/static/kyma.html](http://127.0.0.1:8001/static/kyma.html)

If you don't have any cluster at hand you can use this playground:
[https://killercoda.com/interactive-kyma/scenario/oss-modules](https://killercoda.com/interactive-kyma/scenario/oss-modules)

## Contribute your module

Checkout the community-modules repository and add your own module by adding an entry in the [modules.json](modules.json) file. Example:
```
  {
    "name": "api-gateway",
    "documentation": "https://kyma-project.io/#/api-gateway/user/README",
    "repository": "https://github.com/kyma-project/api-gateway.git",
    "managedResources": [
      "/apis/operator.kyma-project.io/v1alpha1/apigateways",
      "/apis/gateway.kyma-project.io/v1beta1/apirules"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/api-gateway",
      "deploymentYaml": "api-gateway-manager.yaml",
      "crYaml": "apigateway-default-cr.yaml"
    },
    "versions": [
      {
        "version": "2.0.0",
        "deploymentYaml": "https://github.com/kyma-project/api-gateway/releases/download/2.0.0/api-gateway-manager.yaml",
        "crYaml": "https://github.com/kyma-project/api-gateway/releases/download/2.0.0/apigateway-default-cr.yaml"
      }
    ]
  },
```
Fields description:
- **name** - name of your module (keep it short)
- **deploymentYaml** - URL of your module deployment YAML (usually the artifact of your module release)
- **crYaml** - URL of your module default configuration (custom resource)
- **documentation** - documentation URL
- **repository** - main source code repository
- **managedResources** - list of api server resources (paths) that are managed by your module (including the configuration resource)
- **versions** - list of module versions that can be included in release channels. In version entry you can override some module properties (usually deploymentYaml and crYaml)

If you want to test your module, you can have to regenerate modules:
```
npm install
npm run build
```
The public/modules.json file should be created. To test the UI run:
```
kubectl proxy 
```
In another terminal open run
```
npm run dev
```
And open the URL with the query parameter `api=backend`, e.g.: [http://localhost:5173/?api=backend](http://localhost:5173/?api=backend)


For standard contribution rules see [CONTRIBUTING.md](CONTRIBUTING.md).
x
## Code of Conduct
<!--- mandatory section - do not change this! --->

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing
<!--- mandatory section - do not change this! --->

See the [LICENSE file](./LICENSE).
