import wrapModelProxy from '../db/utils/wrapModelProxy.js'


export default (state, name, id) => {
  const doc = getDoc(state, name, id)
  return wrapModelProxy(name, doc, state) // facilitates class style methods
}


const getDoc = (state, name, id) => {
  if (typeof id === 'string') {
    const docs = state[name + 's'] // eg state.users
    return docs?.[id] // eg state.users['1234abcd']
  }

  return id // id is assumed to be an object
}