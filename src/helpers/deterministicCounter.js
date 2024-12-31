export const createCounterRef = seed => {
  const value = seed?.__counterRef.value ?? 0
  return ref = { value }
}

let ref = { value: 0 }



export const incrementCounter = () => ref.value++

export const generateCode = (length = 4) => ('' + ref.value++).padEnd(length, '0')

export const createObjectId = () => ('id' + ref.value++).padEnd(24, '0') // mimic new ObjectId().toString() from mongo