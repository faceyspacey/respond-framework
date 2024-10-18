import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { isNative, isTest } from '../utils/bools.js'
import RespondProvider from './Provider.js'


export default function render(props = {}) {
  const app = createApp(this.state, props)
  const { ctx } = this

  if (isTest) return app

  startReplay(ctx, this.state, this)

  if (!isNative) renderWeb(ctx, app)
  else renderNative(ctx, app, props)

  endReplay(ctx)
}


const createApp = (state, props) => {
  const Provider = props.Provider || state.components?.Provider || RespondProvider
  const { App, Error } = state.components ?? {}

  return React.createElement(Provider, { state, App, Error, ...props })
}


const renderWeb = (ctx, app) => {
  const el = document.getElementById('root')

  ctx.app ??= createRoot(el) // assign to window so component HMR can occur as a natural by-product of HRM (without Fast Refresh webpack plugin) if desired
  ctx.app.render(app)
}

const renderNative = (ctx, app, props) => {
  const { appName = ctx.appName, appParams = ctx.appParams } = props

  AppRegistry.registerComponent(appName, () => () => app)
  AppRegistry.runApplication(appName, appParams)

  ctx.appName = appName // cache for replays
  ctx.appParams = appParams
}


const startReplay = (ctx, state, respond) => {
  ctx.ignoreChangePath = ctx.isReplay = ctx.isFastReplay = true
  state.replayTools.playing = respond.replays.playing = false
}

const endReplay = ctx => {
  requestAnimationFrame(() => {
    ctx.ignoreChangePath = ctx.isReplay = ctx.isFastReplay = false
  })
}