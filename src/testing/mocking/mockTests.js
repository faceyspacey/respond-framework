import 'snapshot-diff/extend-expect'

import mockGlobals from './mockGlobals.js'
import mockDirectory from './mockDirectory.js'
import mockMongoId from './mockMongoId.js'


expect.addSnapshotSerializer({
  print: event => event.type,
  test: v => typeof v === 'function' && v.__event
})

mockGlobals()

mockDirectory('icons')
mockDirectory('widgets', 'ignoredWidgets')

mockMongoId()