import createCookiesMock from './cookies.mock.js'
import createCookiesNative from './cookies.native.js'
import createCookiesWeb from './cookies.web.js'


export default cookies => cookies ?? createCookies()

const createCookies = process.env.NODE_ENV !== 'production'
  ? createCookiesMock
  : process.env.WEB
    ? createCookiesWeb
    : createCookiesNative