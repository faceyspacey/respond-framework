import dateStringToDate from '../utils/dateStringToDate.js'


export const joinSum = async (db, models, specs) => {
  for (const s of specs) {
    if (s.inner) continue

    const { name, from, foreignField: ff, localField, $sum = 1 } = s
    const lf = localField === 'forceId' ? 'id' : localField
    const collection = db[from]
    const range = createDateRangeMatch(s)                                             // stats range match
    
    for (const m of models) {
      const $match = { ...s.$match, [ff]: m[lf] }                                     // eg: { userId: user.id }
      const joinedModels = await collection.super.findMany({ ...range, ...$match })   // user.postCount = eg: db.post.count({ userId: user.id })

      if ($sum === 1) { // count aggregate
        m[name] = joinedModels.length
      }
      else {            // sum aggregate
        m[name] = joinedModels.reduce((sum, jm) => {
          const countedField = $sum.slice(1)                                          // eg: '$earned' -> 'earned'
          const amount = jm[countedField] || 0                                        // eg user.earned
          return amount + sum
        }, 0)
      }
    }
  }

  return models
}


export const joinInner = async (db, models, specs, selector) => {
  if (specs.length === 0) return models                                               // eg user models
  
  const removed = {}

  for (const s of specs) {
    if (!s.inner) continue

    const { name, from, foreignField: ff, localField, filterField: f } = s            // eg: { name: 'favoriteCategory', from: 'post', foreignField: 'userId', localField: 'id', inner: true, filterField: 'category' }
    const lf = localField === 'forceId' ? 'id' : localField
    const sel = selector[name]                                                        // eg: selector['favoriteCategory'] === 'tech'
    const collection = db[from]                                                       // eg: db.post

    for (const m of models) {
      if (sel === undefined && f) continue                                            // when filterField in spec, only explicitly filter if selector sent from client

      let selector = { ...s.$match, [ff]: m[lf] }                                     // eg: { userId: user.id }
      selector = sel && f ? { ...selector, [f]: sel } : selector                      // eg: { userId: user.id, category: 'tech' }
      
      const count = await collection.super.count(selector)                            // eg: db.post.count({ userId: user.id, category: 'tech' }) -> will filter user out if no tech posts

      removed[m.id] = !count
    }

    delete selector[name]
  }

  return models.filter(m => !removed[m.id])
}



// helpers

const createDateRangeMatch = ({ startDate, endDate, $match }) => {
  const $and = $match?.$and ? [...$match.$and] : []

  if (startDate && endDate) {
    $and.push({ createdAt: { $gte: dateStringToDate(startDate) } })
    $and.push({ createdAt: { $lt: dateStringToDate(endDate) } })

    return { $and }
  }
  else if (startDate) {
    $and.push({ createdAt: { $gte: dateStringToDate(startDate) } })
    return { $and }
  }
  else if (endDate) {
    $and.push({ createdAt: { $lt: dateStringToDate(endDate) } })
    return { $and }
  }
}