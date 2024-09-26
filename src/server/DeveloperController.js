import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import findTests, { findTest } from './utils/findTests.js'
import writeTestFile from './utils/writeTestFile.js'
import openFile from './utils/openFile.js'
import { argsOut } from '../db/fetch.js'


export default {
  _callFilteredByRole(context) {
    this.context = context
    return this[context.method](...argsOut(context.args))
  },

  findTests(modulePath, includeChildren, searched, filter) {
    try {
      const tests = findTests(modulePath, includeChildren, searched, filter)
      return { tests }
    }
    catch (e) {
      console.error(e)
      return { error: 'invalid-test-file', params: { reason: e.message } }
    }
  },

  writeTestFile({ name, modulePath = '', settings, events }) {
    if (this.disableTestSaving) return { error: `You can't save tests on the development server` }
    
    const filename = writeTestFile(name, modulePath, settings, events)
    openFile(filename)
    return { filename, success: true }
  },

  deleteTestFile(filename) {
    if (filename.indexOf(path.resolve()) !== 0) {
      const error = 'You are trying to delete a file outside of the project directory'
      return { success: false, error }
    }

    fs.rmSync(filename)
    return { filename, success: true }
  },

  openFile(filename) {
    openFile('__tests__/' + filename)
    return { success: true }
  },

  runTestInTerminal(testname) {
    const dir = path.resolve()
    const command = `osascript -e 'tell app "Terminal" to do script "cd ${dir} && npm test ${testname}"'`

    const isMac = process.platform === 'darwin'

    if (!isMac) {
      const error = `Currently test Terminals can only be run on Mac. If you would like this feature on your OS, please provide a PR with the equivalent of this Mac command: ${command}`
      console.error(error)
      return { success: false, error }
    }

    execSync(command)
    return { success: true }
  },

  // Wallaby Extension

  getWallabyChromeExtensionCode() {
    const filename = path.resolve('respond/wallaby/extension.js')
    const extension = fs.readFileSync(filename, 'utf-8')
    return { extension }
  },

  openEventsFile({ namespace }) {
    openFile('events/' + namespace + '.js')
    return { success: true }
  },

  runTest({ filename, index, delay }) {
    const projectDir = path.resolve()
    const completeFilename = projectDir + '/' + filename
    
    const test = findTest(completeFilename)

    this.context.io.sockets.emit('wallaby', { test, index, delay })
  },
}