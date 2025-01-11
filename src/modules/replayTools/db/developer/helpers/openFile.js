import * as path from 'path'
import * as launch from 'launch-editor'


export default filename => launch(path.resolve(filename), 'code')