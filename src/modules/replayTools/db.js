import createDatabase from '../../db/createDatabase.js'
import developer from '../../server/DeveloperController.js'
import { isDev } from '../../utils.js'

export default isDev && createDatabase({
  controllers: {
    developer
  },
})