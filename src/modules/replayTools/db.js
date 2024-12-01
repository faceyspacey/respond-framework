import createDatabase from '../../db/createDatabase.js'
import developer from '../../server/DeveloperTable.js'
import { isDev } from '../../utils.js'

export default isDev && createDatabase({
  tables: {
    developer
  }
})