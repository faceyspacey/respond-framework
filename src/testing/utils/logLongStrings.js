export default (str, label) => {
  label = label + '\n'
  
  const maxLogChars = 16360
  const logsNecessary = Math.ceil(str.length / maxLogChars)

  for (let i = 0; i < logsNecessary; i++) {
    const start = maxLogChars * i
    const tree = str.substr(start, maxLogChars)

    if (i === 0) {
      const changed = !/no visual difference/.test(tree)
      const diff = changed ? tree.substr(45) : 'Diff: Compared values have no visual difference.'

      console.log(label, diff)
    }
    else console.log(tree)
  }
}