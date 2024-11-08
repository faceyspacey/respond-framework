export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs

export default () => {
  if (typeof window === 'undefined') return idCounterRef.value++ + suffix

  const { replayState } = window.opener?.state ?? window.state
  const ref = replayState?.idCounterRef ?? idCounterRef

  return ref.value++ + suffix
}


export const idCounterRef = { value: 10000 }
