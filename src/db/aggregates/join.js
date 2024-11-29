import dateStringToDate from '../utils/dateStringToDate.js'
import { resolveId } from '../utils/toFromObjectIds.js'


export default ({ ...spec }, parentSelector, collection) => {
  spec.localField = resolveId(spec.localField)

  if (spec.inner) {
    return joinInner(spec, parentSelector, collection)
  }

  return joinSum(spec, parentSelector)
}



const joinSum = (spec, parentSelector) => {
  const { name, from, foreignField, localField = '_id', $sum = 1 } = spec
  const $match = createDateRangeMatch(spec)

  return [
    {
      $lookup: {
        from: from,       // eg: user
        localField,       // eg: _id
        foreignField,     // eg: cityId -- similar to: db.user.findMany({ cityId: city.id })
        as: name,         // eg: userCount (this is the name we give to the array containing joined docs, eg: city.userCount, which can be filtered by the parentSelector -- the real values we want are at city.userCount.0.userCount)
        pipeline: [
          ...($match ? [{ $match }] : []), // additional filter on joined collection, eg { pro: true } || { pro: true, createdDate: { $gte: Date } }
          {
            $group: {
              _id: null,
              [name]: { // eg: userCount
                $sum,   // $sum: 1 is the equivalent of $count helper
              },
            },
          },
          {
            $project: {
              _id: 0
            }
          }
        ],
      }
    },
    { $unwind: { path: '$' + name, preserveNullAndEmptyArrays: true } }, // preserveNullAndEmptyArrays keeps parent rows that have 0 values for their $sums
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ['$$ROOT', { [name]: 0 }, '$' + name], // merge $sum object with main doc, default to 0 if empty values found
        }
      }
    },
    ...(!parentSelector[name] ? [] : [{ $match: { [name]: parentSelector[name] } }]) // filter by summed field itself
  ]
}




const joinInner = (spec, parentSelector, collection) => {
  const { name, from, foreignField = 'userId', localField = '_id', filterField: f } = spec
  const sel = parentSelector[name] // `name` is not a filter client is currently passing

  const hasSelector = sel !== undefined

  if (!hasSelector && f) return [] // when filterField is provided, only explicitly filter if selector sent from client

  const $match = spec.$match
    ? hasSelector && f ? { ...spec.$match, [f]: sel } : spec.$match
    : hasSelector && f ? { [f]: sel } : undefined // if matching sel sent from client, honor it regardless of whether filterField provided

  return [
    {
      $lookup: {
        from: from,       // eg: user
        localField,       // eg: _id
        foreignField,     // eg: cityId -- similar to: db.user.findMany({ cityId: city.id }
        as: name,
        pipeline: $match ? [{ $match: collection._toObjectIdsSelector($match) }] : undefined
      }
    },
    {
      $match: {
        [name]: { $ne: [] } // join must have some, eg, users in post.users to be a match
      }
    },
    { $unset: [name] }
  ]
}





const createDateRangeMatch = ({ startDate, endDate, $match }) => { // filter joined collection aggregate counts based on a date range
  if (startDate && endDate) {
    const $and = $match?.$and || []

    $and.push({ createdAt: { $gte: dateStringToDate(startDate) } })
    $and.push({ createdAt: { $lt: dateStringToDate(endDate) } })

    return { ...$match, $and }
  }
  else if (startDate) {
    return { ...$match, createdAt: { $gte: dateStringToDate(startDate) } }
  }
  else if (endDate) {
    return { ...$match, createdAt: { $lt: dateStringToDate(endDate) } }
  }

  return $match
}