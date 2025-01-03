import * as path from 'path'
import { relativePathToBranch } from './getBranchFromTestPath.js'


export default filename => {
  const projDir = path.resolve()

  const relative = filename.replace(projDir, '')                        // eg: /Users/me/app/modules/child/__tests__/dir/test.js -> /modules/child/__tests__/dir/test.js
  const id = relative.replace(/(modules|__tests__)\//g, '').slice(1)    // eg: /modules/child/__tests__/dir/test.js -> child/dir/test.js

  const name = relative.slice(relative.indexOf('__tests__') + 10)       // eg: /__tests__/dir/some-test.js -> dir/some-test.js
  const branch = relativePathToBranch(relative)                         // eg: /modules/child//modules/grandChild/__tests__/dir/test.js -> 'child.grandChild'

  return { id, name, branch }
}