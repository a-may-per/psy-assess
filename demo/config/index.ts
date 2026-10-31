import { defineConfig } from '@tarojs/cli'

export default defineConfig(async () => ({
  projectName: 'psy-assess-demo',
  date: '2026-10-12',
  designWidth: 750,
  deviceRatio: { 640: 2.34, 750: 1, 828: 1.81 },
  sourceRoot: 'src',
  outputRoot: process.env.TARO_ENV === 'h5' ? 'dist-h5' : 'dist',
  plugins: ['@tarojs/plugin-framework-react'],
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  mini: { postcss: { pxtransform: { enable: true }, url: { enable: true }, cssModules: { enable: false } } },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    devServer: {
      hot: false
    },
    webpackChain(chain: any) {
      chain.performance.maxEntrypointSize(512000).maxAssetSize(512000)
    }
  }
}))
