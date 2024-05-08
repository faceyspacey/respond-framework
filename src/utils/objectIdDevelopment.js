const ref = typeof window !== 'undefined' ? window : {}

ref.__idCounter = 10000

export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs

export default () => {
  if (typeof widndow !== 'undefined' && window.opener) {
    return window.opener.__idCounter++ + suffix
  }

  return ref.__idCounter++ + suffix
}