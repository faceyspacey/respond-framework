export default () => {
  global.window = {
    location: {
      search: '',
      protocol: 'http:',
      host: 'localhost:3000'
    },
    history: {
      replaceState() {},
      pushState() {},
    },
    Image: class Image {},
    navigator: {
      userAgent: ''
    },
    prefetchImage: jest.fn(),
    document: {},
    alert: jest.fn(),
    prompt: jest.fn(),
    confirm: jest.fn()
  }
  
  Object.assign(global, global.window)

  const mockMath = Object.create(global.Math)
  mockMath.random = () => 0.5
  global.Math = mockMath

  global.requestAnimationFrame = func => func()
  global.requestIdleCallback = func => func()
  global.setImmediate = func => func()
  global.setInterval = func => func()
  global.setTimeout = func => func()

  global.console = {
    ...console,
    warn: jest.fn(), // ignore deprecation warnings in output
  }

  const today = new Date('2023-07-04T12:00:00.000Z')

  jest
    .useFakeTimers()
    .setSystemTime(today)
}