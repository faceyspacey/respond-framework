import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { sliceModuleByModulePath } from '../utils/sliceByModulePath.js'
import { isNative, isTest } from '../utils/bools.js'
import RespondProvider from './Provider.js'


export default function render(props = {}) {
  const app = createApp(this, props)

  if (isTest) return app
  if (!isNative) renderWeb(app)
  else renderNative(app, props)
}


const createApp = (store, props) => {
  const mod = sliceModuleByModulePath(store.topModuleOriginal, store.replays.settings.module)

  const Provider = props.Provider || mod.components?.Provider || RespondProvider
  const { App, Error } = mod.components ?? {}

  return React.createElement(Provider, { store, App, Error, ...props })
}


const renderWeb = app => {
  const el = document.getElementById('root')

  window.app ??= createRoot(el) // assign to window so component HMR can occur as a natural by-product of HRM (without Fast Refresh webpack plugin) if desired
  window.app.render(app)
}

const renderNative = (app, props) => {
  const { appName = window.appName, appParams = window.appParams } = props

  AppRegistry.registerComponent(appName, () => () => app)
  AppRegistry.runApplication(appName, appParams)

  window.appName = appName // cache for replays
  window.appParams = appParams
}