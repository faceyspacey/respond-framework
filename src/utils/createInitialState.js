import { sliceStoreByModulePath } from './sliceByModulePath.js'


export default async function createInitialState(mod, store, modulePath = '', reHydratedInitialStateFromParent) {
  const initialState = typeof mod.initialState === 'function'
    ? await mod.initialState(sliceStoreByModulePath(store, modulePath))
    : mod.initialState
    
  return {
    ...initialState,
    ...reHydratedInitialStateFromParent, // re-hydrate initialState specified by parent, such as in server-rendered JSON, eg: `<script>window.initialState = { websiteModule: JSON.parse(${JSON.stringify(json)}, respondReviver) }</script>`
    ...await recurseModules(mod, store, modulePath, initialState)
  }
}

const recurseModules = async (mod, store, modulePath, parentInitialState) => {
  if (!mod.modules) return

  const state = {}

  for (const k in mod.modules) {
    const child = mod.modules[k]
    const path = modulePath ? `${modulePath}.${k}` : k

    state[k] = await createInitialState(child, store, path, parentInitialState[k])
  }
  
  return state
}