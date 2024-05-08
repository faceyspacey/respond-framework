// form edits create an event for every keypress, but--so we don't have unnecessary events in our tests--we take
// only the last one, which contains the whole string for the input. 


export default events => {
  const reversed = events.reverse()                 // start from end so complete value is found before partially keyed ones

  let lastInputName = undefined

  const result = reversed.reduce((acc, e) => {
    if (e.meta?.input) {
      const name = findInputName(e)

      if (lastInputName !== name) {
        lastInputName = name                        // add first input event discovered -- which contains complete value (eg 'Mike')
        return [...acc, e]
      }
      else {
        return acc                                  // do nothing, as input event with complete value was already added
      }
    }

    lastInputName = undefined                       // not an input, so reset lastInputName so any input name will trigger a new event added to result array

    return [...acc, e]
  }, [])

  return result.reverse()                           // set back to original order but with removed unnecessary input events
}


const findInputName = e => Object.keys(e.arg)[0]    // eg: { firstName: 'Mike' } -> 'firstName'