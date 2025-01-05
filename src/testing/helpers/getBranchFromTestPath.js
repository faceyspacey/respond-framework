export default () => {
  const { testPath } = expect.getState()
  const relativePath = testPath.replace(process.cwd(), '')
  return relativePathToBranch(relativePath)
}


export const relativePathToBranch = path => {
  const parts = path.replace('__tests__/', '').split(/\/modules\//)   // eg: ['', 'admin', 'child/dir/some-test.js']
  const [top_, ...moduleParts] = parts.map(p => p.split('/')[0])      // eg: ['', 'admin', 'child']
  return moduleParts.join('.')                                        // eg: 'admin.child'
}