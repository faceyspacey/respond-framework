export const createCounterRef = seed => {
  const value = seed?.__counterRef.value ?? 0
  return ref = { value }
}

let ref = { value: 0 }



export const incrementCounter = () => ref.value++

export const generateCode = (length = 4) => (ref.value++).toString().padStart(length, '0')

export const createObjectId = () => ref.value++ + 10000 + suffix // mimic new ObjectId().toString() from mongo


const suffix = 'abcdefghijklmnopqrs' // 24 digit ID like MongoIDs