import * as fs from 'fs'
import * as path from 'path'
import * as recursiveReadSync from 'recursive-readdir-sync'



export default ({ focusedModulePath = '', searched = '', filter }) => {
  const tests = findTests(focusedModulePath)

  if (!searched) return tests

  if (filter === 'snaps') {
    return filterTestsBySnapSearch(tests, searched)
  }

  const isMatch = createIsTestMatch(searched)
  if (!isMatch) return []

  return tests.filter(t => isMatch(t.id))
}



const findTests = modulePath => {
  const dir = modulePath
    ? modulePath.split('.').reduce((dir, mod) => dir + '/modules/' + mod, projDir()) // eg: /Users/me/app/modules/child/modules/grandChild
    : projDir()+ '/__tests__'                                                        // eg: /Users/me/app/__tests__
  
  return findTestsForModule(dir)
}


const findTestsForModule = dir => {
  if (!fs.existsSync(dir)) return []

  return recursiveReadSync(dir).reduce((tests, filename) => {
    if (!filename.endsWith('.js')) return tests

    const test = findTest(filename)
    if (test) tests.push(test)

    return tests
  }, [])
}


export const findTest = filename => {
  try {
    const file = fs.readFileSync(filename, 'utf-8')

    let settingsStr = file.split('settings = ')[1]
    if (!settingsStr) return null // filter out malformed tests

    settingsStr = settingsStr.split('const events =')[0]
    if (!settingsStr) return null // filter out malformed tests

    const settings = eval('(' + settingsStr + ')') // eval('aVar = ' + settingsStr)

    const eventsStr = file.split('events = ')[1]
    if (!eventsStr) return null // filter out malformed tests
    
    const [eventsStrFinal, rest] = eventsStr.split('let t')
    if (!rest) return null      // filter out malformed tests

    const events = eval(eventsStrFinal).map(({ index: _, ...e }) => ({ ...e, event: { __event: true, type: e.type } })) // reviver will revive event object to function
    
    const updatedAt = fs.statSync(filename).mtime.getTime()

    const { id, name, modulePath } = createId(filename)

    return { id, name, modulePath, filename, updatedAt, settings, events }
  }
  catch (e) {
    throw new Error(filename + ' is in an invalid test file. You likely modified it manually and broke it. Test files must follow the specific format of other tests.')
  }
}


const createId = filename => {
  const relative = filename.replace(projDir(), '')                        // eg: /Users/me/app/modules/child/__tests__/dir/test.js -> /modules/child/__tests__/dir/test.js
  const id = relative.replace(/(modules|__tests__)\//g, '').slice(1)      // eg: /modules/child/__tests__/dir/test.js -> child/dir/test.js

  const name = relative.slice(relative.indexOf('__tests__') + 10)         // eg: /__tests__/dir/some-test.js -> dir/some-test.js

  const parts = relative.replace('__tests__/', '').split(/\/modules\//)   // eg: ['', 'admin', 'child/dir/some-test.js']
  const [top_, ...moduleParts] = parts.map(a => a.split('/')[0])          // eg: ['', 'admin', 'child']
  const modulePath = moduleParts.join('.')                                // eg: 'admin.child'

  return { id, name, modulePath }
}


const createIsTestMatch = searched => {
  const isRegex = searched.startsWith('/')

  if (isRegex) {
    const insensitive = searched.endsWith('/i')                                     // eg: /foo/i

    searched = insensitive ? searched.slice(0, -1) : searched                       // eg: /foo/
    
    searched = searched.endsWith('/') ? searched.slice(1, -1) : searched.slice(1)   // eg: 'foo'
    searched = searched.endsWith('\\') ? searched + '/' : searched                  // eg: 'foo\\' -> 'foo\\/' - assume the user is in the middle of escaping a subdirectory, eg: /drawer\/

    try {
      const reg = insensitive ? new RegExp(searched, 'i') : new RegExp(searched)
      return id => reg.test(id)
    }
    catch {}
  }
  else {
    const str = searched.toLowerCase()
    return id => id.toLowerCase().indexOf(str) !== -1
  }
}




const createIsSnapMatch = searched => {
  const isRegex = searched.startsWith('/')

  if (isRegex) {
    const insensitive = searched.endsWith('/i')

    searched = insensitive ? searched.slice(0, -1) : searched
    searched = searched.endsWith('/') ? searched.slice(1, -1) : searched.slice(1)

    try {
      const reg = insensitive ? new RegExp(searched, 'i') : new RegExp(searched)
      return file => reg.test(file)
    }
    catch {}
  }
  else {
    return file => file.indexOf(searched) > -1
  }
}



const filterTestsBySnapSearch = (tests, searched) => {
  const isMatch = createIsSnapMatch(searched)
  if (!isMatch) return []

  return tests.filter(t => {
    const index = t.filename.lastIndexOf('/')                             // eg: /Users/me/app/__tests__/foo.js                                   

    const dir = t.filename.slice(0, index)                                // eg: /Users/me/app/__tests__
    const name = t.filename.slice(index)                                  // eg: foo.js_

    const snapshotFilename = dir + '/__snapshots__' + name + '.snap'      // eg /Users/me/app/__tests__/__snapshots__/foo.js.snap

    const exists = fs.existsSync(snapshotFilename)
    if (!exists) return false

    const file = fs.readFileSync(snapshotFilename, 'utf-8')

    return isMatch(file)
  })
}



const projDir = () => path.resolve()