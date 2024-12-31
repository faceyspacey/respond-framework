import mockGlobals from './mockGlobals.js'
import mockEvents from './mockEvents.js'
import mockDirectory from './mockDirectory.js'


export default () => {
  mockGlobals()
  mockEvents()
  
  mockDirectory('icons')
  mockDirectory('widgets', 'ignoredWidgets')
}