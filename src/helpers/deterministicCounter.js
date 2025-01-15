import { ObjectId } from 'bson'
import { isDev } from '../helpers/constants.js'


export const createCounterRef = seed => {
  ref.value = seed?.__counterRef.value ?? 0
  return ref
}

const ref = { value: 0 }



const genNumber =      () => ref.value++
const genId =          () => ('id' + ref.value++).padEnd(24, '0')             // mimic new ObjectId().toString() from mongo
const genCode =        (length = 4) => ('' + ref.value++).padEnd(length, '0') // only containers letters in production
const genNumericCode = (length = 4) => ('' + ref.value++).padEnd(length, '0')




export const incrementCounter = genNumber

export const generateId = isDev ? genId : () => new ObjectId().toString()

export const generateNumericCode = isDev ? genNumericCode : (length = 4) => // max length 16
  Math.random()
    .toString()
    .slice(2, length + 2)
    .padStart(length, '0') // if Math.random() returns eg .5, need to pad it


export const generateCode = isDev ? genCode : (length = 4) => // max length 10
  Math.random()
    .toString(36) // radix arg reduces max length
    .slice(2, length + 2)
    .toUpperCase()
    .padStart(length, '0')