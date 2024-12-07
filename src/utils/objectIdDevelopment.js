export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs

export default () => ref.value++ + suffix

export const createCounterRef = seed => {
  const value = seed?.__idCount.value ?? 10000
  return ref = { value }
}

let ref = { value: 10000 }