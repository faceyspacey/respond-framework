import { prependModulePath } from '../../../utils/sliceByModulePath.js'


export default (e, modulePath, modulePathSetting) => {
  const fullType = prependModulePath(e.type, modulePath)    // revive full type: events from nested module subdirectories don't have the full app-wide modulePath in test files
  
  const currType = fullType.replace(modulePathSetting, '')  // however, if we're running the test from within a nested module, we need to remove the parent paths the app can't currently display 
  const type = currType.indexOf('.') === 0 ? currType.slice(1) : currType
  
  return { ...e, type }
}