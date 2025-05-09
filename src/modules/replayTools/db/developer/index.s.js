import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import findTests, { findTest } from './helpers/findTests.js'
import writeTestFile from './helpers/writeTestFile.js'
import openFile from './helpers/openFile.js'
import { argsOut as out } from '../../../../helpers/fetch.js'


export default {
  call(req, context) {
    this.body = req.body
    
    this.req = req
    this.context = context

    const { method, args } = req.body
    return this[method](...out(args))
  },

  findTests(params) {
    try {
      const tests = findTests(params)
      return { tests }
    }
    catch (e) {
      console.error(e)
      return { error: 'invalid-test-file', params: { reason: e.message } }
    }
  },

  writeTestFile({ name, branch = '', settings, events }) {
    const filename = writeTestFile(name, branch, settings, events)
    openFile(filename)
    return { filename, success: true }
  },

  deleteTestFile(filename) {
    fs.rmSync(path.resolve(filename))
    return { filename, success: true }
  },

  openFile(filename) {
    openFile(filename)
    return { success: true }
  },

  runTestInTerminal(filename) {
    const dir = path.resolve()
    const command = `osascript -e 'tell app "Terminal" to do script "cd ${dir} && npm test ${filename}"'`

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