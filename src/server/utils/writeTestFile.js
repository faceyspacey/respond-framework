import * as fs from 'fs'
import * as path from 'path'


export default (name, modulePath, settings, events) => {
	const { filename, content } = createTest(name, modulePath, settings, events)
  writeTestFile(filename, content)
  return filename
}




const createTest = (name, modulePath, settings, events) => {
  const filename = createFilename(name, modulePath)
  const content = createTestFile(settings, cleanAndNumberEvents(events))
  return { filename, content }
}


const createFilename = (name, modulePath) => {
  const projectDir = path.resolve()

  const moduleDir = modulePath
    ? modulePath.split('.').reduce((dir, mod) => dir + '/modules/' + mod, projectDir)
    : projectDir

  const currentModuleTestsDir = moduleDir + '/__tests__/'
  const cleanName = name.replace(/ /g, '-').replace('.js', '')

  return currentModuleTestsDir + cleanName + '.js'
}


const createTestFile = (settings, events) =>
`import setupTest from 'testing/setupTest.js'

const settings = ${JSON.stringify(settings, null, 2)}

const events = ${JSON.stringify(events, null, 2)}

let t

beforeAll(async () => {
  t = await setupTest({ settings })
})

${events.map(createIndividualTest).join('\n\n')}`



const createIndividualTest = (e, i) => {
  const { type, arg } = e    
  
  const argString = JSON.stringify(arg)
  const argStringLength = argString?.length

  const testName = argStringLength
    ? argStringLength <= 80 ? `${i}. ${type} - ${argString}` : `${i}. ${type} - arg`
    : `${i}. ${type}`

  return `test(\`${testName}\`, async () => {
  await t.snap(events[${i}])
})`
}



const writeTestFile = (filename, content) => {
  const dir = filename.slice(0, filename.lastIndexOf('/'))

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filename, content)
  fs.chmodSync(filename, 0o777)
}


const cleanAndNumberEvents = events => events.map((e, i) => {
  const { type, arg = {}, meta: { trigger, input, ...meta } = {} } = e

  return {
    index: i,
    type,
    arg:  Object.keys(arg).length === 0 ? undefined : arg,
    meta: Object.keys(meta).length === 0 ? undefined : meta
  }
})
