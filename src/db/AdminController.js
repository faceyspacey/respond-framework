import stringToRegex, { isRegexString } from './utils/stringToRegex.js'
import dateStringToDate from './utils/dateStringToDate.js'
import db from '../db.js'


export default {
  async findByQueryPaginated(query) {
    const {
      project,
      sortKey = 'updatedAt',
      sortValue = -1,
      limit,
      skip = 0,
      startDate,
      endDate,
      lastLocation,
      location = lastLocation,
      ...sel
    } = query

    const collection = db[this._name]
    const selector = this._createQuerySelector(collection._toObjectIdsSelector(sel)) // clear unused params, transform regex strings, date handling

    const sort = { [sortKey]: sortValue, _id: sortValue, location }
    const stages = collection.aggregateStages?.map(s => ({ ...s, startDate, endDate })) || []

    const { [this._namePlural]: models, count } = await collection.aggregate({ selector, stages, project, sort, limit, skip })

    return {
      [this._namePlural]: models,
      count,
      query,
    }
  },

  _createQuerySelector({ ...selector }) {
    Object.keys(selector).forEach(k => {
      let v = selector[k]
      const paramCleared = v === '' || v === undefined
  
      if (paramCleared) {
        delete selector[k]
        return
      }
  
      if (typeof v === 'string' && !isRegexString(v) && !/id$/i.test(k) && !k.endsWith('Date')) { // dont convert id selectors to regexes
        v = '/^' + v + '/i'
      }
  
      selector[k] = isRegexString ? stringToRegex(v) : v
    })

    // dates are passed as strings in objects, and possibly dont have years, eg: { $gt: '5/1' }
    if (selector.createdAt) {
      const key = Object.keys(selector.createdAt)[0] // eg: $gt
      selector.createdAt = { [key]: dateStringToDate(selector.createdAt[key]) } // eg: { $gt: DateObject }
    }

    if (selector.updatedAt) {
      const key = Object.keys(selector.updatedAt)[0] // eg: $gt
      selector.updatedAt =  { [key]: dateStringToDate(selector.updatedAt[key]) }
    }

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

    return selector
  },
}