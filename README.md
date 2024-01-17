# Kyma community modules


> **This repository contains an early prototype, and is not meant to be used in the production use case. Feel free to try it out, leave feedback, and report issues.**


## Overview

Install Kyma modules in your Kubernetes cluster. You can select modules from the list and deploy them in your cluster. You can also choose the release channel (experimental, fast, or regular) and the version of the module.



## Prerequisites

- kubectl
- kubernetes cluster (KUBECONFIG configured)
- kyma-system namespace created (some modules installation can fail without it)

## Installation

### In-cluster
```
kubectl run ui --image=ghcr.io/kyma-project/community-modules:latest
```

When the pod is ready, start kubectl proxy:
```
kubectl wait --for=condition=ready pod ui
kubectl proxy
```

Open Web UI with this link: [http://127.0.0.1:8001/api/v1/namespaces/default/pods/ui/proxy/](http://127.0.0.1:8001/api/v1/namespaces/default/pods/ui/proxy/)

### With CLI
You need node.js (version 20 or above)

```
npm install -g kyma
```

Now you can see available kyma modules and their versions:
```
kyma modules

istio: 1.1.2 (experimental), 1.2.1 (fast, regular)
api-gateway: 2.0.0 (experimental, fast, regular)
serverless: 1.2.1 (fast, regular)
btp-operator: 1.1.1 (fast, regular)
telemetry: 1.5.1 (regular), 1.6.0 (fast), 1.6.0-dev (experimental)
nats: v1.0.2 (experimental, fast, regular)
eventing: 1.0.1 (experimental), 1.0.2 (fast, regular)
application-connector: 1.0.5 (fast, regular)
keda: 1.0.2 (fast, regular)
transparent-proxy: 1.3.1 (fast, regular)
cap-operator: v0.0.1 (experimental, fast, regular)
cluster-ip: 0.0.28
```

You can deploy one or more modules (add option `--dry-run` to see kubectl commands without executing them):
```
kyma deploy -m serverless nats eventing --defaultConfig --dry-run

kubectl apply -f https://github.com/kyma-project/serverless/releases/download/1.2.1/serverless-operator.yaml
kubectl apply -f https://github.com/kyma-project/serverless/releases/download/1.2.1/default-serverless-cr.yaml
kubectl apply -f https://github.com/kyma-project/nats-manager/releases/download/v1.0.2/nats-manager.yaml
kubectl apply -f https://github.com/kyma-project/nats-manager/releases/download/v1.0.2/nats_default_cr.yaml
kubectl apply -f https://github.com/kyma-project/eventing-manager/releases/download/1.0.2/eventing-manager.yaml
kubectl apply -f https://github.com/kyma-project/eventing-manager/releases/download/1.0.2/eventing_default_cr.yaml
```

You can provide the module version by adding `:<version>` sufix to the module name. If not provided the version from the provided channel will be used, or the latest version if channel is not specified.

You can also start the web interface locally:
```
kyma ui
```

### Killercoda

If you don't have any cluster at hand you can use this playground:
[https://killercoda.com/interactive-kyma/scenario/oss-modules](https://killercoda.com/interactive-kyma/scenario/oss-modules)

Sample view for managed Kyma Runtime:

![](modules-ui.png)

## Clean up

Just stop the proxy (Ctrl+C) and delete the UI pod:
```
kubectl delete pod ui
```

## Run (develop) locally

Prepare your development cluster and configure kubectl (KUBECONFIG). Start the proxy:
```
kubectl proxy
```
Now open new terminal window and execute:
```
npm install
npm run build
npm run dev
```
Now open the provided URL with the query parameter `api=backend`, e.g.: [http://localhost:5173/?api=backend](http://localhost:5173/?api=backend)



## Contribute your module

Add your own module by adding an entry in the [modules.js](./modules.js) file. Example:
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
- **latestGithubRelease** - information how to fetch the latest github release
  - **repository** - repository owner / repository name
  - **deploymentYaml** - release artifact name of deployment YAML
  - **crYaml** - release artifact name of your module default configuration
- **documentation** - documentation URL
- **repository** - main source code repository
- **managedResources** - list of api server resources (paths) that are managed by your module (including the configuration resource)
- **versions** - list of module versions that can be included in release channels. In version entry you can override some module properties (usually deploymentYaml and crYaml)
  - **deploymentYaml** - URL of your module version deployment YAML (usually the artifact of your module release)
  - **crYaml** - URL of your module version default configuration (custom resource)

If you want to test your module, you can have to regenerate modules:
```
npm run build
```


For standard contribution rules see [CONTRIBUTING.md](CONTRIBUTING.md).
x
## Code of Conduct
<!--- mandatory section - do not change this! --->

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing
<!--- mandatory section - do not change this! --->

See the [LICENSE file](./LICENSE).
