import * as React from 'react'
import { AppRegistry } from 'react-native'
import { createRoot } from 'react-dom/client'
import { sliceModuleByModulePath } from '../utils/sliceByModulePath.js'
import RespondContext from './context.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isNative, isTest } from '../utils/bools.js'


export default function render(appInfo = window.appInfo) {
  const app = renderModule(this)

  if (isTest) return app

  if (isNative) {
    const { appName, appParameters } = appInfo

    AppRegistry.registerComponent(appName, () => () => app)
    AppRegistry.runApplication(appName, appParameters)

    window.appInfo = appInfo // cache for replays
    return
  }

  window.app ??= createRoot(document.getElementById('root')) // assign to window so component HMR can occur as a natural by-product of HRM (without Fast Refresh webpack plugin) if desired
  window.app.render(app)
}




const renderModule = store => {
  const mod = sliceModuleByModulePath(store.topModuleOriginal, store.replays.settings.module)
  const { App, Provider = RespondProvider } = mod

  return (
    <Provider store={store}>
      <App />
      <ReplayTools />
    </Provider>
  )
}



const RespondProvider = ({ store, children }) =>
  <RespondContext.Provider value={store}>
    {children}
  </RespondContext.Provider>
