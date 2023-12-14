export default
[
  {
    "name": "istio",
    "documentation": "https://kyma-project.io/#/istio/user/00-overview/README",
    "repository": "https://github.com/kyma-project/istio.git",
    "managedResources": [
      "/apis/extensions.istio.io/v1alpha1/wasmplugins",
      "/apis/install.istio.io/v1alpha1/istiooperators",
      "/apis/networking.istio.io/v1alpha3/destinationrules",
      "/apis/networking.istio.io/v1alpha3/envoyfilters",
      "/apis/networking.istio.io/v1alpha3/gateways",
      "/apis/networking.istio.io/v1alpha3/serviceentries",
      "/apis/networking.istio.io/v1alpha3/sidecars",
      "/apis/networking.istio.io/v1alpha3/virtualservices",
      "/apis/networking.istio.io/v1alpha3/workloadentries",
      "/apis/networking.istio.io/v1alpha3/workloadgroups",
      "/apis/networking.istio.io/v1beta1/destinationrules",
      "/apis/networking.istio.io/v1beta1/gateways",
      "/apis/networking.istio.io/v1beta1/proxyconfigs",
      "/apis/networking.istio.io/v1beta1/serviceentries",
      "/apis/networking.istio.io/v1beta1/sidecars",
      "/apis/networking.istio.io/v1beta1/virtualservices",
      "/apis/networking.istio.io/v1beta1/workloadentries",
      "/apis/networking.istio.io/v1beta1/workloadgroups",
      "/apis/operator.kyma-project.io/v1alpha1/istios",
      "/apis/operator.kyma-project.io/v1alpha2/istios",
      "/apis/security.istio.io/v1/authorizationpolicies",
      "/apis/security.istio.io/v1/requestauthentications",
      "/apis/security.istio.io/v1beta1/authorizationpolicies",
      "/apis/security.istio.io/v1beta1/peerauthentications",
      "/apis/security.istio.io/v1beta1/requestauthentications",
      "/apis/telemetry.istio.io/v1alpha1/telemetries"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/istio",
      "deploymentYaml": "istio-manager.yaml",
      "crYaml": "istio-default-cr.yaml"
    },
    "versions": []
  },
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
    "versions": []
  },
  {
    "name": "serverless",
    "documentation": "https://kyma-project.io/#/serverless-manager/user/README",
    "repository": "https://github.com/kyma-project/serverless-manager.git",
    "managedResources": [
      "/apis/serverless.kyma-project.io/v1alpha2/functions",
      "/apis/operator.kyma-project.io/v1alpha1/serverlesses"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/serverless-manager",
      "deploymentYaml": "serverless-operator.yaml",
      "crYaml": "default-serverless-cr.yaml"
    },
    "versions": []
  },
  {
    "name": "btp-operator",
    "documentation": "https://kyma-project.io/#/btp-manager/user/README",
    "repository": "https://github.com/kyma-project/btp-manager.git",
    "managedResources": [
      "/apis/services.cloud.sap.com/v1/serviceinstances",
      "/apis/services.cloud.sap.com/v1/servicebindings",
      "/apis/services.cloud.sap.com/v1alpha1/servicebindings",
      "/apis/services.cloud.sap.com/v1alpha1/serviceinstances",
      "/apis/operator.kyma-project.io/v1alpha1/btpoperators"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/btp-manager",
      "deploymentYaml": "btp-manager.yaml",
      "crYaml": "btp-operator-default-cr.yaml"
    },
    "versions": []
  },
  {
    "name": "telemetry",
    "documentation": "https://kyma-project.io/#/telemetry-manager/user/README",
    "repository": "https://github.com/kyma-project/telemetry-manager.git",
    "managedResources": [
      "/apis/operator.kyma-project.io/v1alpha1/telemetries",
      "/apis/telemetry.kyma-project.io/v1alpha1/logparsers",
      "/apis/telemetry.kyma-project.io/v1alpha1/logpipelines",
      "/apis/telemetry.kyma-project.io/v1alpha1/tracepipelines"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/telemetry-manager",
      "deploymentYaml": "telemetry-manager.yaml",
      "crYaml": "telemetry-default-cr.yaml"
    },
    "versions": []
  },
  {
    "name": "nats",
    "documentation": "https://kyma-project.io/#/nats-manager/user/README",
    "repository": "https://github.com/kyma-project/nats-manager.git",
    "managedResources": [
      "/apis/operator.kyma-project.io/v1alpha1/nats"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/nats-manager",
      "deploymentYaml": "nats-manager.yaml",
      "crYaml": "nats_default_cr.yaml"
    },
    "versions": []
  },
  {
    "name": "eventing",
    "documentation": "https://kyma-project.io/#/eventing-manager/user/README",
    "repository": "https://github.com/kyma-project/eventing-manager.git",
    "manageable": true,
    "managedResources": [
      "/apis/eventing.kyma-project.io/v1alpha1/subscriptions",
      "/apis/eventing.kyma-project.io/v1alpha2/subscriptions",
      "/apis/operator.kyma-project.io/v1alpha1/eventings"
    ],
    "latestGithubRelease" : {
      "repository": "kyma-project/eventing-manager",
      "deploymentYaml": "eventing-manager.yaml",
      "crYaml": "eventing_default_cr.yaml"
    },
    "versions": []
  },
  {
    "name": "application-connector",
    "documentation": "https://kyma-project.io/#/application-connector-manager/user/README",
    "repository": "https://github.com/kyma-project/application-connector-manager.git",
    "manageable": true,
    "managedResources": [
      "/apis/operator.kyma-project.io/v1alpha1/applicationconnectors"
    ],
    "latestGithubRelease" : {
      "repository": "kyma-project/application-connector-manager",
      "deploymentYaml": "application-connector-manager.yaml",
      "crYaml": "default_application_connector_cr.yaml"
    },
    "versions": []

  },
  {
    "name": "keda",
    "documentation": "https://kyma-project.io/#/keda-manager/user/README",
    "repository": "https://github.com/kyma-project/keda-manager.git",
    "managedResources": [
      "/apis/operator.kyma-project.io/v1alpha1/kedas",
      "/apis/keda.sh/v1alpha1/clustertriggerauthentications",
      "/apis/keda.sh/v1alpha1/scaledjobs",
      "/apis/keda.sh/v1alpha1/scaledobjects",
      "/apis/keda.sh/v1alpha1/triggerauthentications"
    ],
    "manageable": true,
    "latestGithubRelease" : {
      "repository": "kyma-project/keda-manager",
      "deploymentYaml": "keda-manager.yaml",
      "crYaml": "keda-default-cr.yaml"
    },
    "versions": []
  },
  {
    "name": "transparent-proxy",
    "documentation": "https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/transparent-proxy-in-kyma-environment",
    "managedResources": [
      "apis/operator.kyma-project.io/v1alpha1/transparentproxies"
    ],
    "manageable": true,
    "versions": []
  },
  {
    "name": "cap-operator",
    "documentation": "https://sap.github.io/cap-operator/docs/",
    "repository": "https://github.com/SAP/cap-operator-lifecycle.git",
    "managedResources": [
      "/apis/operator.sme.sap.com/v1alpha1/capoperators"
    ],
    "community": true,
    "manageable": false,
    "latestGithubRelease" : {
      "repository": "SAP/cap-operator-lifecycle",
      "deploymentYaml": "manager_manifest.yaml",
      "crYaml": "manager_default_CR.yaml"
    },
    "versions": []    
  },
  {
    "name": "cluster-ip",
    "documentation": "https://github.com/pbochynski/cluster-ip#readme",
    "repository": "https://github.com/pbochynski/cluster-ip.git",
    "managedResources": [
      "apis/operator.kyma-project.io/v1alpha1/clusterips"
    ],
    "community": true,
    "manageable": false,
    "latestGithubRelease" : {
      "repository": "pbochynski/cluster-ip",
      "deploymentYaml": "cluster-ip-operator.yaml",
      "crYaml": "cluster-ip-nodes.yaml",
    },
    "versions": []
  }
]