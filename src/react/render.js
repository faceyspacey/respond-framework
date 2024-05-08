import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { sliceModuleByModulePath } from '../utils/sliceByModulePath.js'
import RespondContext from './context.js'
import ReplayTools from '../modules/replayTools/App/index.js'
import { isNative, isTest } from '../utils.js'


export default function render() {
  const app = renderModule(this)

  if (isTest || isNative) return app

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
