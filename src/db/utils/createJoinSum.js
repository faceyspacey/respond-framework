import isProd from '../../utils/isProd.js'


const createJoinSum = (name, from, foreignField, localField = '_id', selector = {}, $match, $sum = 1) => {
  if (shouldConvertToMongoId(foreignField, localField)) {
    localField = '_id'
  }

  
  // allow for filtering joined collection aggregate counts based on a date range, e.g. so we can see how many users course.userCount has for a given month (eg to attribute to the pro of a course how many users signed up during a specific month)
  if (selector.startDate && selector.endDate) {
    const $and = $match?.$and || []

    $and.push({ createdAt: { $gte: selector.startDate } })
    $and.push({ createdAt: { $lt: selector.endDate } })

    $match = { ...$match, $and }
  }
  else if (selector.startDate) {
    $match = { ...$match, createdAt: { $gte: selector.startDate } }
  }
  else if (selector.endDate) {
    $match = { ...$match, createdAt: { $lt: selector.endDate } }
  }


  return [
    {
      $lookup: {
        from,             // eg users
        localField,       // eg _id
        foreignField,     // eg postId
        as: name,         // eg userCount (this is just the name we give to the array containing joined docs, eg: city.userCount -- the real values we want are at city.userCount.0.userCount)
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
    { $unwind: { path: '$' + name, preserveNullAndEmptyArrays: true } }, // preserveNullAndEmptyArrays keeps rows that have 0 values for their $sums
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: ['$$ROOT', { [name]: 0 }, '$' + name], // merge $sum object with main doc, default to 0 if empty values found
        }
      }
    },
    ...createSumSelector(name, selector),
  ]
}


const createJoinSumMock = (name, from, foreignField, localField, selector, $match, $sum = 1) => {
  return [{ name, from, foreignField, localField, $match, $sum }] // used to manually perform the join sums in development
}




export default !isProd ? createJoinSumMock : createJoinSum




// courses use the actual id field (from iGolf) and therefore don't need to be converted to _id

const shouldConvertToMongoId = (foreignField, localField) =>
  localField === 'id' && foreignField !== 'courseId' && foreignField !== 'lastCourseId'



const createSumSelector = (name, selector) => {
  if (!selector[name]) return []

  const selectorValue = selector[name]
  delete selector[name] // mutable convenience: selector for parent collection will no longer try to filter by this selector

  return [{ $match: { [name]: selectorValue } }]
}