export default (collection, from, foreignField, localField = '_id', $project, $projectJoin, $match, $sort = { updatedAt: -1, _id: -1 }, $limit = 20, inner = false) => {
  return [
    {
      $lookup: {
        from,             // eg user
        localField,       // eg _id
        foreignField,     // eg postId
        as: from,         // eg user
        pipeline: [
          ...($match ? [{ $match }] : []),
          ...($projectJoin ? [{ $project: $projectJoin }] : []),
          { $sort },
          { $limit },
        ]
      }
    },
    ...($project ? [{ $project }] : []),
    {
      $unwind: { path: '$' + from, preserveNullAndEmptyArrays: !inner } // inner/outer: when true preserveNullAndEmptyArrays keeps parent rows that have have no joined children (default)
    },
    {
      $group: {
        _id: 'tmp',
        [collection]: {
          $addToSet: {
            $mergeObjects: ['$$ROOT', { [from]: null }]
          }
        },
        [from]: {
          $addToSet: '$' + from
        }
      }
    },
    { $unset: `${collection}.${from}` }, // remove [from]: null from outer collection rows
    { $unset: '_id' },
  ]
}





/**
 * the following isn't in use, but we can use it in the future when we need to do multiple joins at once:
 
usage:

static async joinUsersAndRounds() {
  const stages = [
    createLookup('users', 'courseId'),
    createLookup('rounds', 'courseId'),
    ...unwindLookups('courses', ['users', 'rounds'])
  ]

  const models = await this.collection.aggregate(stages).toArray()
}
*/


export const createLookup = (from, foreignField, localField = '_id', $project, $match, $sort = { updatedAt: -1, _id: -1 }, $limit = 20) => {

  return {
    $lookup: {
      from,             // eg users
      localField,       // eg _id
      foreignField,     // eg courseId
      as: from,         // eg users
      pipeline: [
        ...($match ? [{ $match }] : []),
        ...($project ? [{ $project }] : []),
        { $sort },
        { $limit },
      ]
    }
  }
}


export const unwindLookups = (collection, joins) => {

  return [
    ...($project ? [{ $project }] : []),
    ...joins.map(from => ({
      $unwind: { path: '$' + from, preserveNullAndEmptyArrays: true }
    })),
    {
      $group: {
        _id: 'tmp',
        [collection]: {
          $addToSet: {
            $mergeObjects: ['$$ROOT', ...joins.map(from => ({ [from]: null }))]
          }
        },
        ...joins.reduce((froms, from) => ({
          ...froms,
          [from]: { $addToSet: '$' + from }
        }), {}),
      }
    },
    ...joins.map(from => ({ $unset: `${collection}.${from}` })),
    { $unset: '_id' },
  ]
}