import mockGlobals from './mockGlobals.js'
import mockEvents from './mockEvents.js'
import mockMongoId from './mockMongoId.js'
import mockDirectory from './mockDirectory.js'


export default () => {
  mockGlobals()
  mockEvents()
  mockMongoId()
  
  mockDirectory('icons')
  mockDirectory('widgets', 'ignoredWidgets')
}