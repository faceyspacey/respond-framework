export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs

export default () => {
  return idCounter++ + suffix
  if (typeof window === 'undefined') return idCounter++ + suffix

  const { replays } = window.opener?.state.respond ?? window.state.respond
  return replays.idCounter++ + suffix
}


let idCounter = 10000