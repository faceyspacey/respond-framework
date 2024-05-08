import { act } from 'react-test-renderer'

export default func => {
  if (process.env.NODE_ENV !== 'test') return func

  return (...args) => {
    act(() => {
      func(...args)
    })
  }
}