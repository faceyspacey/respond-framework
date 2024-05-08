export default options => {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.NODE_ENV !== 'test' && process.env.WEB && typeof window !== undefined && window.__REDUX_DEVTOOLS_EXTENSION__
}