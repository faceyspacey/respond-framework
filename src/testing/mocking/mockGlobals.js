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
  global.queueMicrotask = func => func()

  global.console = {
    ...console,
    warn: jest.fn(), // ignore deprecation warnings in output
  }

  const today = new Date('2023-07-04T12:00:00.000Z')

  jest
    .useFakeTimers()
    .setSystemTime(today)
}





// Date.prototype.timezoneOffset = new Date().getTimezoneOffset();

// Date.setTimezoneOffset = function(timezoneOffset) {
//   return this.prototype.timezoneOffset = timezoneOffset;
// };

// Date.getTimezoneOffset = function(timezoneOffset) {
//   return this.prototype.timezoneOffset;
// };

// Date.prototype.setTimezoneOffset = function(timezoneOffset) {
//   return this.timezoneOffset = timezoneOffset;
// };

// Date.prototype.getTimezoneOffset = function() {
//   return this.timezoneOffset;
// };

// Date.prototype.toString = function() {
//   var offsetDate, offsetTime;
//   offsetTime = this.timezoneOffset * 60 * 1000;
//   offsetDate = new Date(this.getTime() - offsetTime);
//   return offsetDate.toUTCString();
// };

// ['Milliseconds', 'Seconds', 'Minutes', 'Hours', 'Date', 'Month', 'FullYear', 'Year', 'Day'].forEach((function(_this) {
//   return function(key) {
//     Date.prototype["get" + key] = function() {
//       var offsetDate, offsetTime;
//       offsetTime = this.timezoneOffset * 60 * 1000;
//       offsetDate = new Date(this.getTime() - offsetTime);
//       return offsetDate["getUTC" + key]();
//     };
//     return Date.prototype["set" + key] = function(value) {
//       var offsetDate, offsetTime, time;
//       offsetTime = this.timezoneOffset * 60 * 1000;
//       offsetDate = new Date(this.getTime() - offsetTime);
//       offsetDate["setUTC" + key](value);
//       time = offsetDate.getTime() + offsetTime;
//       this.setTime(time);
//       return time;
//     };
//   };
// })(this));