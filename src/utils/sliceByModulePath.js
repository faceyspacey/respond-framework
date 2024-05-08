import createDbProxy from '../db/utils/createDbProxy.js'


const sliceByModulePath = (obj, modulePath) => {
  if (!obj) return
  if (!modulePath) return obj
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
}


export default sliceByModulePath


export const sliceModuleByModulePath = (obj, modulePath) => {
  if (!obj) return
  if (!modulePath) return obj
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice.modules[k], obj)
}



export const stripModulePath = (type, modulePath) => {
  return modulePath ? type.slice(modulePath.length + 1) : type
}

export const prependModulePath = (typeOrNamespace, modulePath) => {
  return modulePath
    ? typeOrNamespace ? `${modulePath}.${typeOrNamespace}` : modulePath // type could be an empty string namespace
    : typeOrNamespace
}

export const prependModulePathToE = e => {
  const namespace = prependModulePath(e._namespace, e.modulePath)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { type, namespace, ...e, type, namespace }
}


export const sliceModule = (store, modulePath) => {
  if (!modulePath) return store

  return {
    ...store,
    events: sliceByModulePath(store.events, modulePath),
    state: sliceByModulePath(store.state, modulePath)
  }
}


export const recreateFullType = (e, modulePath = e.modulePath) => {
  const namespace = prependModulePath(e._namespace, modulePath)
  return prependModulePath(e._type, namespace)
}


export const sliceStoreByModulePath = (store, modulePath = '', modularDb = false) => {
  if (!modulePath) return store

  const events = sliceByModulePath(store.events, modulePath)
  const state = sliceByModulePath(store.state, modulePath)
  const topModule = sliceModulesByModulePath(store.topModule, modulePath)
  const db = !modularDb ? store.db : createDbProxy(store.db, modulePath)
  
  return { ...store, events, state, db, topModule, modulePath }
}



const sliceModulesByModulePath = (topModule, modulePath) => {
  if (!modulePath) return topModule

  return modulePath
    .split('.')
    .reduce((slice, k) => {
      return slice.modules[k]
    }, topModule)
}


export const sliceEventByModulePath = (e, modulePath = e.modulePath) => {
  if (!modulePath) return { ...e }

  const type = stripModulePath(e.type, modulePath)
  const namespace = stripModulePath(e.namespace, modulePath)

  return {
    type, // appear first in devtools
    namespace,
    ...e,
    type, // overwrite
    namespace,
  }
}