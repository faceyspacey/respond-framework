import { prependPath, stripPath } from '../../../utils/sliceByModulePath.js'


export default (e, modulePath, focusedModulePath) => {
  const fullType = prependPath(modulePath, e.type)    // revive full type: events from nested module subdirectories don't have the full app-wide modulePath in test files
  const type = stripPath(focusedModulePath, fullType)  // however, if we're running the test from within a nested module, we need to remove the parent paths the app can't currently display 
  return { ...e, type }
}