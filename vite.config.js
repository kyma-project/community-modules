export default 
{
  server: {
    proxy: {
      // with options
      '/backend': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, '/'),
      }
    }
  }
}