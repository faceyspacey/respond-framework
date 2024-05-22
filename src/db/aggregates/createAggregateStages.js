import joinInnerAndSum from './join.js'


export default (collection, specs = [], $match, $proj, $sort, $limit, $skip) => {
  $match = collection._toObjectIdsSelector($match)

  const stages = []

  if ($match) stages.push({ $match })

  specs.forEach(spec => {
    const joinedCollection = collection.db()[spec.from]
    const arr = joinInnerAndSum(spec, $match, joinedCollection)
    if ($match) delete $match[spec.name] // important: delete so only join collection is affected, as selector is applied within joinSum (if in fact passed from client)
    stages.push(...arr)
  })

  if (!$sort.location?.lat || collection.config.useLocalDb) {
    delete $sort.location
    stages.push({ $sort })
  }
  else {
    stages.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [$sort.location.lng, $sort.location.lat] },
        spherical: true,
        distanceField: 'distance',
        key: 'location'
      }
    })
  }

  stages.push({ $skip: $skip * $limit })
  stages.push({ $limit })

  if ($proj) stages.push({ $project: collection._toProject($proj) })
  
  return stages
}


export const createStagesCount = stages => {
  stages = stages.filter(s => !s.$sort && !s.$skip && !s.$limit && !s.$project && !s.$geoNear)
  stages.push({ $count: 'count' })
  return stages
}