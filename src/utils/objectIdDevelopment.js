import { ObjectId } from 'bson'
import { isProd } from './bools.js'


export const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs

export default function objectIdDevelopment() {
  if (typeof window === 'undefined') return idCounterRef.value++ + suffix

  const { replayState } = window.opener?.state.respond ?? window.state.respond
  const ref = replayState?.idCounterRef ?? idCounterRef

  return ref.value++ + suffix
}


export const idCounterRef = { value: 10000 }


export const generateId = isProd ? () => new ObjectId().toString() : () => objectIdDevelopment()