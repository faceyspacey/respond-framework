export { default as setupTest } from './testing/setupTest.js'

export { default as mockDirectory } from './testing/utils/mockDirectory.js'
export { default as mockIncrementingNumber } from './testing/utils/mockIncrementingNumber.js'
export { default as mockMongoId } from './testing/utils/mockMongoId.js'
export { default as mockGlobals } from './testing/utils/mockGlobals.js'

export { suffix } from './utils/objectIdDevelopment.js'

export const respondEventSymbol = Symbol.for('respondEvent')