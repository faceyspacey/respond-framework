import stringToRegex, { isRegexString } from '../utils/stringToRegex.js'
import dateStringToDate from '../utils/dateStringToDate.js'
import { isForeignOrLocalKey } from './toFromObjectIds.js'


export default function({ customQuery, ...selector }) {
  Object.keys(selector).forEach(k => {
    let v = selector[k]

    if (paramCleared(k, v, selector)) {
      return
    }
    else if (isDateAtString(k)) {                       // dates can be passed as strings in comparison objects
      ({ k, v } = convertDateAtString(k, v, selector))  // eg: { $gt: '5/1' } -> { $gt: new Date('5/2/2025') }
    }
    else if (shouldConvertToRegex(k, v)) {
      v = '/^' + v + '/i'
    }

    selector[k] = isRegexString(v) ? stringToRegex(v) : v
  })

  maybeFilterBySignupDateRange(selector)

  return customQuery ? evalCustomQuery(customQuery, selector) : selector
}




const paramCleared = (k, v, selector) => {
  const cleared = v === '' || v === undefined ||
    (selector[k] && typeof selector[k] === 'object' && Object.values(selector[k]).length === 1 && v === undefined) // eg: selector.foo = { $gt: undefined }

  if (!cleared) return

  delete selector[k]
  return true
}



const isDateAtString = k => k.endsWith('AtString')       // eg: 'createdAtString'

const convertDateAtString = (k, v, selector) => {
  const comparison = Object.keys(v)[0]                   // eg: $gt

  delete selector[k]

  return {
    k: k.replace('String', ''),
    v: { [comparison]: dateStringToDate(v[comparison]) } // eg: { $gt: Date }
  }
}




const shouldConvertToRegex = (k, v) =>
  typeof v === 'string' &&
  !isRegexString(v) &&        // ingore values already provided as regex wrapped in front slashes
  !isForeignOrLocalKey(k) &&  // ignore id selectors
  !k.endsWith('Date')         // ignore special signupStartDate || signupEndDate selectors






const evalCustomQuery = ({ ...selector }) => {
  try {
    delete selector.customQuery // be sure it's gone, so selector doesn't try to match the key `customQuery`
    
    const obj = eval(`(${customQuery})`) // save both the string form + queryable fields
    Object.assign(selector, obj)
  }
  catch (error) {} // do nothing

  return selector
}




const maybeFilterBySignupDateRange = selector => {
  if (selector.signupStartDate) {
    selector.$and = selector.$and || []

    selector.$and.push({
      createdAt: {
        $gte: dateStringToDate(selector.signupStartDate)
      }
    })

    delete selector.signupStartDate
  }

  if (selector.signupEndDate) {
    selector.$and = selector.$and || []
    
    selector.$and.push({
      createdAt: {
        $lt: dateStringToDate(selector.signupEndDate)
      }
    })

    delete selector.signupEndDate
  }
}