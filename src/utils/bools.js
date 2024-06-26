export const isProd = process.env.NODE_ENV === 'production'

export const isDev = !isProd

export const isTest = process.env.NODE_ENV === 'test'

export const isServer = typeof window === 'undefined'

export const isNative = !isServer && !(typeof document !== 'undefined' && document.querySelector) && !isTest

export const hasLocalStorage = typeof localStorage !== 'undefined'

export const hasSessionStorage = typeof sessionStorage !== 'undefined'