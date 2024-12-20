import snapshotDiff from 'snapshot-diff'
import { findAllByPropsAndType, findByPropsAndType } from './finders.js'
import logLongStrings from './logLongStrings.js'


export default (respond, renderer) => (e, conf) => {
  const suffix = conf.suffix ? '-' + conf.suffix : ''
  const shouldLog = process.env.WALLABY ? conf.logInWallaby : conf.logInTerminal

  if (conf.snipes && e.snipes) {
    matchSnipes(renderer.getInternal(), e.snipes)
  }
  
  if (conf.testIDs) {
    snapTestIDs(renderer.getInternal())
  }
  
  if (conf.snapState || conf.logState) {
    const prev = respond.state.prevState
    const next = respond.snapshot()

    const label = 'state' + suffix

    if (conf.snapState) {
      expect(next).toMatchSnapshot(label)
    }

    if (shouldLog) {
      if (conf.logStateDiff) {
        const diff = snapshotDiff(prev, next, { stablePatchmarks: true })
        logLongStrings(diff, label)
      }
      else if (conf.logState) {
        const all = JSON.stringify(next, undefined, '\t')
        logLongStrings(all, label)
      }
    }
  }
  
  if (conf.snapComponents || conf.logComponents || conf.logComponentsDiff) {
    const { prev, next } = renderer.toPrevNextJSON()
    

    const label = 'components' + suffix

    if (conf.snapComponents) {
      expect(next).toMatchSnapshot(label)
    }

    if (shouldLog) {
      if (conf.logComponentsDiff) {
        const diff = snapshotDiff(prev, next, { stablePatchmarks: true })
        logLongStrings(diff, label)
      }
      else if (conf.logComponents) {
        logLongStrings(next, label)
      }
    }
  }
}



// snipes

const matchSnipes = (renderer, snipes) => {
  snipes.forEach((snipe) => {
    const { type, props, length, not, match = props } = snipe // allow test to not specify match, and instead match against props itself

    try {
      if (length !== undefined) {
        const els = findAllByPropsAndType(renderer, props, type) 
        expect(els.length).toEqual(length)
      }
      else if (not) {
        expect(() => {
          const el = findByPropsAndType(renderer, props, type) // if can't be found, it will throw
  
          if (match) {
            expect(el.props).toMatchObject(match) // if match is provided, el.props will be expected to match it
          }
        }).toThrow()
      }
      else {
        const el = findByPropsAndType(renderer, props, type)
        expect(el.props).toMatchObject(match)
      }
    }
    catch (e) {
      let snipeFailure = 'snipe failed: \n\n' 
      snipeFailure += JSON.stringify(snipe, null, 2)
      snipeFailure += ' \n\n' + e.message

      throw new Error(snipeFailure)
    }
  })
}




// testIDs

const snapTestIDs = renderer => {
  const els = renderer.root.findAll(i => i.props.testID)

  expect(els.length).toMatchSnapshot('testIDs-length')

  els.forEach(el => {
    const { testID } = el.props
  
    if (el.props.test) {
      const propsToTest = el.props.test.split(',')

      propsToTest.forEach(k => {
        expect(el.props[k]).toMatchSnapshot(testID + '-' + k)
      })
    }
    else {
      expect(el.props).toMatchSnapshot(testID)
    }
  })
}