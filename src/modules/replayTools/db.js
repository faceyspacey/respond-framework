import createDatabase from '../../db/createDatabase.js'
import { developer } from './db/index.js'
import { isDev } from '../../utils.js'

export default isDev && createDatabase({
  tables: {
    developer
  }
})