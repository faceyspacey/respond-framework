import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { isNative, isTest } from '../helpers/constants.js'
import RespondProvider from './Provider.js'


export default function render(conf = {}, opts = {}) {
  const { startTime, last } = opts
  if (startTime) console.log('replayEvents.run', parseFloat((performance.now() - startTime).toFixed(3)))

  const start = performance.now()

  const app = createApp(this, conf, last)

  if (isTest) return app
  else if (!isNative) renderWeb(this, this.mem, app)
  else renderNative(this, this.mem, app, conf)

  queueMicrotask(() => console.log('render', parseFloat((performance.now() - start).toFixed(3))))
}


const createApp = (respond, conf, last) => {
  if (last) respond.state.replayTools.playing = false // optimization, so additional render isn't queued after main render -- see replayEvents.js

  const state = conf.state?.respond.proxify() ?? respond.proxify() // props.state passed in via App(props, state) in userland, but under the hood, for things like replayEvents we just call respond.render() with state already existing on respond.state; and in actuality, it will also exist when you do App(props, state), but will throw if you pass an incorrect object for state; it's really just a teaching mechanism that we offer App(props, state), i.e. to establish the proper mental model

  const Provider = conf.Provider || state.components?.Provider || RespondProvider
  const { App, Error } = state.components ?? {}

  respond.mem.rendered = true
  
  return React.createElement(Provider, { state, App, Error, ...conf })
}


const renderWeb = (respond, mem, app) => {
  const el = document.getElementById('root')

  if (respond.state.options.unmountOnReplays) {
    if (mem.app) mem.app.unmount()
    mem.app = createRoot(el)
  }
  else mem.app ??= createRoot(el)


  mem.app.render(app)
}

const renderNative = (respond, mem, app, conf) => {
  const appName = conf.props?.appName ?? mem.appName
  const appParams = conf.props?.appParams ?? mem.appParams

  AppRegistry.registerComponent(appName, () => () => app)
  AppRegistry.runApplication(appName, appParams)

  mem.appName = appName // cache for replays
  mem.appParams = appParams
}