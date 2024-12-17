import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { isNative, isTest } from '../helpers/constants.js'
import RespondProvider from './Provider.js'


export default function render(props = {}, { startTime, last } = {}) {
  if (startTime) console.log('replayEvents.run', parseFloat((performance.now() - startTime).toFixed(3)))

  const start = performance.now()

  const app = createApp(this, props, last)
  const { mem } = this

  if (isTest) return app

  if (!isNative) renderWeb(mem, app)
  else renderNative(mem, app, props)

  queueMicrotask(() => console.log('render', parseFloat((performance.now() - start).toFixed(3))))
}


const createApp = (respond, props, last) => {
  if (last) respond.state.replayTools.playing = false 

  const state = respond.proxify()

  const Provider = props.Provider || state.components?.Provider || RespondProvider
  const { App, Error } = state.components ?? {}

  respond.mem.rendered = true
  
  return React.createElement(Provider, { state, App, Error, ...props })
}


const renderWeb = (mem, app) => {
  const el = document.getElementById('root')

  mem.app ??= createRoot(el) // assign to window so component HMR can occur as a natural by-product of HRM (without Fast Refresh webpack plugin) if desired
  mem.app.render(app)
}

const renderNative = (mem, app, props) => {
  const { appName = mem.appName, appParams = mem.appParams } = props

  AppRegistry.registerComponent(appName, () => () => app)
  AppRegistry.runApplication(appName, appParams)

  mem.appName = appName // cache for replays
  mem.appParams = appParams
}