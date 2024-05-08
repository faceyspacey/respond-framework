import isProd from '../../utils/isProd.js'
import { toObjectIdsSelector } from './toFromObjectIds.js'


const createJoinFilter = (name, from, foreignField = 'courseId', localField = '_id', selector) => {
  const $match = toObjectIdsSelector(selector)

  if (localField === 'id' && foreignField !== 'courseId' && foreignField !== 'lastCourseId') localField = '_id'

  return [
    {
      $lookup: {
        from: from,
        localField,
        foreignField,
        as: name,
        pipeline: [
          { $match }
        ]
      }
    },
    {
      $match: {
        [name]: { $ne: [] } // join must have some, eg, users in course.users to be a match
      }
    },
    { $unset: [name] }
  ]
}



const createJoinFilterMock = (name, from, foreignField, localField, selector) => {
  return [{ from, foreignField, localField, selector }]
}


export default !isProd ? createJoinFilterMock : createJoinFilter
