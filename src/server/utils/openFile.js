import * as path from 'path'
import * as launch from 'launch-editor'


export default name => {
  const filename = path.resolve(name)
  launch(filename, 'code')
}