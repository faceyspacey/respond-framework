import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { isNative, isTest } from '../helpers/constants.js'
import RespondProvider from './Provider.js'


export default function render(props = {}, opts = {}) {
  const { startTime, last } = opts
  if (startTime) console.log('replayEvents.run', parseFloat((performance.now() - startTime).toFixed(3)))

  const start = performance.now()

  const app = createApp(this, props, last)

  if (isTest) return app
  else if (!isNative) renderWeb(app, this.mem, this)
  else renderNative(app, this.mem)

  queueMicrotask(() => console.log('render', parseFloat((performance.now() - start).toFixed(3))))
}


const createApp = (respond, props, last) => {
  if (last) respond.state.replayTools.playing = false // optimization, so additional render isn't queued after main render -- see replayEvents.js

  respond.mem.rendered = true
  respond.mem.props ??= props

  const state = respond.proxify()
  const Provider = props.Provider || state.components?.Provider || RespondProvider

  return React.createElement(Provider, { state, ...respond.mem.props })
}


const renderWeb = (app, mem, respond) => {
  const el = document.getElementById('root')

  if (respond.state.options.unmountOnReplays) {
    if (mem.app) mem.app.unmount()
    mem.app = createRoot(el)
  }
  else mem.app ??= createRoot(el)


  mem.app.render(app)
}

const renderNative = (app, { props }) => {
  AppRegistry.registerComponent(props.appName, () => () => app)
  AppRegistry.runApplication(props.appName, props.appParams)
}