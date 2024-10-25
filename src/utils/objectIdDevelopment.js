const ref = {}

ref.idCounter = 10000

if (typeof window !== 'undefined') {
  window.__respondContext = ref
}



export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs


export default () => {
  if (typeof widndow !== 'undefined' && window.opener) {
    return window.opener.__respondContext.idCounter++ + suffix
  }

  return ref.idCounter++ + suffix
}