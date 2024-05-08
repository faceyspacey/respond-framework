export default modulePath => {
  const paths = modulePath.split('.')
  const youngestChildModuleName = modulePath ? paths[paths.length - 1] : 'Top'

  const name = ucFirst(youngestChildModuleName)
  const text = name.length > 18 ? name.slice(0, 16) + '..' : name

  return [{ value: false, text }, { value: true, text: 'All' }]
}

const ucFirst = text => text[0].toUpperCase() + text.slice(1)