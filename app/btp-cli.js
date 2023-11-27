const regions = ["eu10","eu11","eu20","eu30","ca10","us10","us20","us30","us21","jp10","jp20","in30","ap10","ap11","ap12","ap21","br10"]

function location(region) {
  return `
    location /${region}/ {
      proxy_pass https://cpcli.cf.${region}.hana.ondemand.com/;
      proxy_set_header Host cpcli.cf.${region}.hana.ondemand.com;
    }
  `
}
function generateConfig() {
  let c = `server {
    listen 80;` 
  for (let region of regions) {
    c+=location(region)
  }
  c+='}'
  console.log("NGINX config:\n",c)
  return c
}
const cliProxy = 
[
  {
    "apiVersion": "v1",
    "kind": "ConfigMap",
    "metadata": {
      "name": "btp-cli-config"
    },
    "data": {
      "nginx.conf": generateConfig()
    }
  },
  {
    "apiVersion": "apps/v1",
    "kind": "Deployment",
    "metadata": {
      "name": "btp-cli"
    },
    "spec": {
      "replicas": 1,
      "selector": {
        "matchLabels": {
          "app": "btp-cli"
        }
      },
      "template": {
        "metadata": {
          "labels": {
            "app": "btp-cli"
          }
        },
        "spec": {
          "containers": [
            {
              "name": "nginx",
              "image": "nginx:latest",
              "ports": [
                {
                  "containerPort": 80
                }
              ],
              "volumeMounts": [
                {
                  "name": "nginx-config-volume",
                  "mountPath": "/etc/nginx/conf.d"
                }
              ]
            }
          ],
          "volumes": [
            {
              "name": "nginx-config-volume",
              "configMap": {
                "name": "btp-cli-config"
              }
            }
          ]
        }
      }
    }
  },
  {
    "apiVersion": "v1",
    "kind": "Service",
    "metadata": {
      "name": "btp-cli"
    },
    "spec": {
      "selector": {
        "app": "btp-cli"
      },
      "ports": [
        {
          "protocol": "TCP",
          "port": 80,
          "targetPort": 80
        }
      ],
      "type": "ClusterIP"
    }
  }
]


export {cliProxy}