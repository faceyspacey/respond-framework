import mockGlobals from './mockGlobals.js'
import mockEvents from './mockEvents.js'
import mockDirectory from './mockDirectory.js'


export default () => {
  mockGlobals()
  mockEvents()
  
  mockDirectory('icons')
  mockDirectory('widgets', 'ignoredWidgets')
}




// const originalDate = Date

// function mockTimezone(timezoneOffset) {
//   globalThis.Date = class extends originalDate {
//     constructor(...args) {
//       if (args.length === 0) {
//         const utcDate = new originalDate()
//         const utcTime = utcDate.getTime()
//         const localTime = utcTime + (timezoneOffset * 60 * 1000)

//         super(localTime)
//       }
//       else {
//         super(...args)
//       }
//     }
//   };
// }


// // mockTimezone(-7 * 60)


// const today = new Date('2023-07-04T12:00:00.000-07:00')

// jest
//   .useFakeTimers()
//   .setSystemTime(today)