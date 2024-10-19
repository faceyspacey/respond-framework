import createCookiesMock from './cookies.mock.js'
import createCookiesNative from './cookies.native.js'
import createCookiesWeb from './cookies.web.js'


export default process.env.NODE_ENV !== 'production'
  ? createCookiesMock
  : process.env.WEB
    ? createCookiesWeb
    : createCookiesNative