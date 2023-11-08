sleep 1 && open http://127.0.0.1:8001/static/kyma.html &
kubectl proxy -w='app'
