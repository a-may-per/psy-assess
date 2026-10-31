import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'psy-assess-demo',
  date: '2026-10-12',
  designWidth: 750,
  deviceRatio: { 640: 2.34, 750: 1, 828: 1.81 },
  sourceRoot: 'src',
  outputRoot: process.env.TARO_ENV === 'h5' ? 'dist-h5' : 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  framework: 'react',
  compiler: 'webpack5',
  mini: { postcss: { pxtransform: { enable: true }, url: { enable: true }, cssModules: { enable: false } } },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    template: 'src/templates/index.html',
    devServer: {
      hot: false
    },
    webpackChain(chain: any) {
      chain.performance.maxEntrypointSize(512000).maxAssetSize(512000)
    }
  } as any
})
