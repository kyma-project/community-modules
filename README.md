# Kyma community modules

## Overview

Install Kyma modules in your Kubernetes cluster

## Prerequisites

- kubectl
- kubernetes cluster (KUBECONFIG configured)

## Installation

Execute these commands:
```
git clone https://github.com/kyma-project/community-modules
cd community-modules
kubectl proxy -w='app'
```
Open Web UI with this link: [http://127.0.0.1:8001/static/kyma.html](http://127.0.0.1:8001/static/kyma.html)


## Contributing
<!--- mandatory section - do not change this! --->

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Code of Conduct
<!--- mandatory section - do not change this! --->

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Licensing
<!--- mandatory section - do not change this! --->

See the [LICENSE file](./LICENSE).
