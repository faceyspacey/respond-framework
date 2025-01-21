import applySelector from '../utils/applySelector.js'
import { joinInner, joinSum } from './join.mock.js'


export default async (specs = [], { db, collectionName, selector, sort }) => {  
  const collection = db[collectionName]

  const m1 = await collection.findAll()                 // grab all models, as we have to manually join them in this file
  const m2 = await joinInner(db, m1, specs, selector)   // allow specs with `inner` flag to filter docs in parent collection if no children in joined collection found
  const m3 = await joinSum(db, m2, specs)               // produce sums as virtual fields on parent collection, optionally filtered by a date range
  
  const m4 = m3.filter(applySelector(selector))         // potentially apply selector to virtual sum fields

  if (sort.location) reverse(sort)

  return m4
}



const reverse = sort => {
  delete sort.location
  const sortKey = Object.keys(sort)[0]
  sort[sortKey] = -sort[sortKey]                        // reverse to indicate geo sorting was triggered
}