import UniversalCookie from 'universal-cookie'


export default () => {
  if (_cookies) return _cookies
  
  class Cookies extends UniversalCookie {
    get(k) {
      return super.get(k)
    }
  
    set(k, v, opts = {}) {
      const options = {
        ...opts,
        path: '/',
        expires: opts.expires || new Date(2032, 1, 1, 0, 0, 1), // Chrome doesn't seem to be letting you set cookies for longer than 13 months currently
        maxAge: opts.mageAge || 60 * 60 * 24 * 365 * 10 // 10 years
      }
  
      return super.set(k, v, options)
    }
  
    remove(k, opts = {}) {
      const options = { ...opts, path: '/', maxAge: 0 }
      return super.remove(k, options)
    }
  }
  
  return _cookies = new Cookies
}

let _cookies