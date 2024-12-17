export default el => {
  if (el.type === 'TextInput') {
    return {
      focus: () => {

      },
      blur: () => {

      }
    }
  }

  if (el.type === 'ScrollView') {
    return {
      scrollTo() {

      },
    }
  }

  return null
}