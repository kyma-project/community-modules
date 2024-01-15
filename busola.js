const kubeconfig = {
  "apiVersion": "v1",
  "clusters": [
    {
      "cluster": {
        "server": "http://127.0.0.1:3015/backend"
      },
      "name": "kyma"
    }
  ],
  "contexts": [
    {
      "context": {
        "cluster": "kyma",
        "user": "admin"
      },
      "name": "kyma"
    }
  ],
  "current-context": "kyma",
  "kind": "Config",
  "preferences": {},
  "users": [
    {
      "name": "admin",
      "user": {
        "token": "tokentokentoken"
      }
    }
  ]
}
const config = {
  "config": {
    "storage": "localStorage",
    "features": {
      "PROTECTED_RESOURCES": {
        "isEnabled": true,
        "config": {
          "resources": [
            {
              "match": {
                "$.metadata.labels['serverless.kyma-project.io/managed-by']": "function-controller"
              },
              "message": "Resource managed by: function-controller"
            },
            {
              "match": {
                "$.metadata.labels['reconciler.kyma-project.io/managed-by']": "reconciler"
              },
              "messageSrc": "$.metadata.annotations['reconciler.kyma-project.io/managed-by-reconciler-disclaimer']"
            },
            {
              "match": {
                "$.metadata.labels['istio.io/rev']": "default"
              },
              "message": "Resource managed by Istio control plane"
            },
            {
              "match": {
                "$.metadata.labels['applicationconnector.kyma-project.io/managed-by']": "compass-runtime-agent"
              }
            }
          ]
        }
      },
      "LEGAL_LINKS": {
        "config": {
          "legal-disclosure": {
            "default": "https://www.sap.com/corporate/en/legal/impressum.html",
            "de": "https://www.sap.com/corporate/de/legal/impressum.html"
          },
          "privacy": {
            "default": "https://help.sap.com/viewer/82bdf2271c6041f79387c122147cf774/Cloud/en-US"
          },
          "copyright": {
            "default": "https://www.sap.com/corporate/en/legal/copyright.html",
            "de": "https://www.sap.com/corporate/de/legal/copyright.html"
          },
          "trademark": {
            "default": "https://www.sap.com/corporate/en/legal/trademark.html",
            "de": "https://www.sap.com/corporate/de/legal/trademark.html"
          }
        }
      },
      "SSO_LOGIN": {
        "isEnabled": false,
      },
      "KUBECONFIG_ID": {
        "isEnabled": true,
        "config": {
          "kubeconfigUrl": "/kubeconfig",
          "defaultKubeconfig": "kyma.yaml"
        }
      },
      "SENTRY": {
        "isEnabled": true,
        "selectors": [],
        "config": {
          "dsn": "https://016845744e4741cc9bea0caaabc0fe87@o399001.ingest.sentry.io/5953495"
        }
      },
      "SHOW_KYMA_VERSION": {
        "isEnabled": true
      },
      "SHOW_GARDENER_METADATA": {
        "isEnabled": true
      },
      "EXTERNAL_NODES": {
        "isEnabled": true,
        "stage": "SECONDARY"
      },
      "HIDDEN_NAMESPACES": {
        "isEnabled": true,
        "config": {
          "namespaces": [
            "istio-system",
            "kube-system"
          ]
        }
      },
      "GZIP": {
        "isEnabled": true
      },
      "EXTENSIBILITY": {
        "isEnabled": true
      },
      "EXTENSIBILITY_INJECTIONS": {
        "isEnabled": true
      },
      "EXTENSIBILITY_WIZARD": {
        "isEnabled": true
      },
      "TRACKING": {
        "isEnabled": false
      },
      "EVENTING": {
        "isEnabled": true,
        "selectors": [
          {
            "type": "apiGroup",
            "apiGroup": "eventing.kyma-project.io"
          }
        ]
      },
      "API_GATEWAY": {
        "isEnabled": true,
        "selectors": [
          {
            "type": "apiGroup",
            "apiGroup": "gateway.kyma-project.io"
          }
        ]
      },
      "GARDENER_LOGIN": {
        "isEnabled": false,
        "kubeconfig": null
      },
      "ISTIO": {
        "isEnabled": true
      },
      "RESOURCE_VALIDATION": {
        "isEnabled": true,
        "config": {
          "policies": [
            "Default"
          ]
        }
      },
      "CLUSTER_VALIDATION": {
        "isEnabled": true
      },
      "FEEDBACK": {
        "isEnabled": true,
        "link": "https://sapinsights.eu.qualtrics.com/jfe/form/SV_d3UPNymSgUHAb9Y?product=SAP%20BTP,%20Kyma%20Runtime&product_filter=Kyma"
      }
    }
  }
}

function defaultKubeconfig(port) {
  let kc = { ...kubeconfig }
  kc.clusters[0].cluster.server = `http://127.0.0.1:${port}/backend`
  return kc
}

function defaultConfig(port) {
  let cfg = { ...config }
  cfg.config.features.EXTERNAL_NODES = {
    isEnabled: true,
    stage: 'SECONDARY',
    nodes: [
      {
        category: 'Installation',
        icon: 'product',
        children: [{
          label: 'Modules',
          link: `http://127.0.0.1:${port}/modules`
        }]
      }
    ]
  }
  return cfg
}
export { defaultKubeconfig, defaultConfig }