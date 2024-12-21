import 'snapshot-diff/extend-expect'

export default () => {
  expect.addSnapshotSerializer({
    print: event => event.type,
    test: v => typeof v === 'function' && v.__event
  })
}