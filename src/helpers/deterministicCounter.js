import { ObjectId } from 'bson'
import { isDev } from '../helpers/constants.js'


export const createCounterRef = seed => {
  const value = seed?.__counterRef.value ?? 0
  return ref = { value }
}

let ref = { value: 0 }



const genNumber =      () => ref.value++
const genCode =        (length = 4) => ('' + ref.value++).padEnd(length, '0')
const genNumericCode = (length = 4) => ('' + ref.value++).padEnd(length, '0') // only numeric in production
const genId =          () => ('id' + ref.value++).padEnd(24, '0')             // mimic new ObjectId().toString() from mongo




export const incrementCounter = genNumber


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


export const generateId = isDev ? genId : () => new ObjectId().toString()