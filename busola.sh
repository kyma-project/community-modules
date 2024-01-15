container_id=$(docker create europe-docker.pkg.dev/kyma-project/prod/kyma-dashboard-local-dev:latest)
docker cp $container_id:/app/core-ui ./dist/