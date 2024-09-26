export default function sliceByModulePath(obj, modulePath) {
  if (!modulePath) return obj
  if (!obj) return
  
  const modules = modulePath.split('.')
  return modules.reduce((slice, k) => slice[k], obj)
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




export const stripModulePath = (type, modulePath) =>
  modulePath ? type.slice(modulePath.length + 1) : type


export const prependModulePath = (typeOrNamespace, modulePath) =>
  modulePath
    ? typeOrNamespace ? `${modulePath}.${typeOrNamespace}` : modulePath // type could be an empty string namespace
    : typeOrNamespace


export const prependModulePathToE = e => {
  const namespace = prependModulePath(e._namespace, e.modulePath)
  const type = namespace ? `${namespace}.${e._type}` : e._type

  return { type, namespace, ...e, type, namespace }
}


export const recreateFullType = (e, modulePath = e.modulePath) => {
  const namespace = prependModulePath(e._namespace, modulePath)
  return prependModulePath(e._type, namespace)
}




export const traverseModules = (store, callback) => {
  callback(store)

  for (const k of store.moduleKeys) {
    traverseModules(store[k], callback)
  }
}