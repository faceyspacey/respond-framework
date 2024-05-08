import isTest from './isTest.js'

export default !(typeof document !== 'undefined' && document.querySelector) && !isTest