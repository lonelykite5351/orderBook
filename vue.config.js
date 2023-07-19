const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  outputDir: 'orderBook_build',
  assetsDir: 'static',
  transpileDependencies: true
})
