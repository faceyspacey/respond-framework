import * as fs from 'fs'
import * as path from 'path'


export default (name, modulePath, settings, events) => {
	const { filename, content } = createTest(name, modulePath, settings, events)
  writeTestFile(filename, content)
  return filename
}




const createTest = (name, modulePath, settings, events) => {
  const moduleDir = createModuleDir(modulePath)
  const filename = createFilename(moduleDir, name)
  const levels = name.split('/').length
  const content = createTestFile(moduleDir, levels, settings, cleanAndNumberEvents(events))
  return { filename, content }
}


const createModuleDir = modulePath => {
  const projectDir = path.resolve()

  return modulePath
    ? modulePath.split('.').reduce((dir, mod) => dir + '/modules/' + mod, projectDir)
    : projectDir
}


const createFilename = (moduleDir, name) => {
  const testDir = moduleDir + '/__tests__'
  const cleanName = name.replace(/ /g, '-').replace('.js', '')

  return testDir + '/' + cleanName + '.js'
}


const createTestFile = (moduleDir, length, settings, events) => {
  const setupTestFile = moduleDir + '/setupTest.js'
  const exists = fs.existsSync(setupTestFile)

  const dotdots = Array.from({ length }).map(_ => '..').join('/')

  const imports = exists
    ? `import setupTest from '${dotdots}/setupTest.js'`
    : `import { setupTest } from 'respond-framework/testing'\nimport top from '${dotdots}/index.js'`

  const opts = exists ? `{ settings }` : `{ settings, top }`

  return `${imports}

const settings = ${JSON.stringify(settings, null, 2)}

const events = ${JSON.stringify(events, null, 2)}

let t

beforeAll(async () => {
  t = await setupTest(${opts})
})

${events.map(createIndividualTest).join('\n\n')}`
}



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
  const { type, arg = {}, meta: { trigger, input, cached, ...meta } = {} } = e

  return {
    index: i,
    type,
    arg:  Object.keys(arg).length === 0 ? undefined : arg,
    meta: Object.keys(meta).length === 0 ? undefined : meta
  }
})
