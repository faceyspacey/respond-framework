import * as path from 'path'
import { relativePathToBranch } from './getBranchFromTestPath.js'


export default filename => {
  const id = filename.replace(/(modules|__tests__)\//g, '')             // eg: /modules/child/__tests__/dir/test.js -> child/dir/test.js

  const name = filename.slice(filename.indexOf('__tests__') + 10)       // eg: /__tests__/dir/some-test.js -> dir/some-test.js
  const branch = relativePathToBranch(filename)                         // eg: /modules/child//modules/grandChild/__tests__/dir/test.js -> 'child.grandChild'

  return { id, name, branch }
}