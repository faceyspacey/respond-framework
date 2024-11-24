// this file adds the following 3 buttons to test rows in Wallaby Explorer:

// - Run Test
// - Run Test Step By Step
// - View Event File


href = window.location.href

shouldRun = href.indexOf('https://wallabyjs.com/app/') === 0

if (!shouldRun) {
  alert('You are running WallabyExplorer on the wrong URL -- run it on: https://wallabyjs.com/app/#/tests')
}



// dom modification

addRespondButtons = () => {
  const tests = document.querySelectorAll('.test')

  for (const t of tests) {
    if (t.hasIcons) continue
    const f = t.parentElement.parentElement.parentElement.parentElement.querySelector('.file')

    const summary = t.querySelector('.summary')

    const eventsIcon = document.createElement('span')
    eventsIcon.className = 'fas fa-sm fa-code'
    eventsIcon.style.display = 'table-cell'
    eventsIcon.style.cursor = 'pointer'
    eventsIcon.style.color = 'rgb(253, 1, 244)'
    eventsIcon.style.textAlign = 'right'
    eventsIcon.style.paddingRight = '5px'
    summary.appendChild(eventsIcon)
    eventsIcon.addEventListener('click', () => openEventFile(t))

    const runTestStepsIcon = document.createElement('span')
    runTestStepsIcon.className = 'fas fa-sm fa-clone'
    runTestStepsIcon.style.display = 'table-cell'
    runTestStepsIcon.style.cursor = 'pointer'
    runTestStepsIcon.style.color = 'rgb(0, 159, 255)'
    runTestStepsIcon.style.textAlign = 'right'
    runTestStepsIcon.style.paddingRight = '5px'
    summary.appendChild(runTestStepsIcon)
    runTestStepsIcon.addEventListener('click', () => runTest(f, t))


    const runTestIcon = document.createElement('span')
    runTestIcon.className = 'fas fa-sm fa-bullseye'
    runTestIcon.style.display = 'table-cell'
    runTestIcon.style.cursor = 'pointer'
    runTestIcon.style.color = 'rgb(12, 245, 12)'
    runTestIcon.style.textAlign = 'right'
    summary.appendChild(runTestIcon)
    runTestIcon.addEventListener('click', () => runTest(f, t, 0))

    f.lastTest = t

    t.hasIcons = true
  }



  // add icon to test file row to execute last test within the file
  const files = document.querySelectorAll('.file')

  for (const f of files) {
    if (f.hasIcons) continue

    const runTestStepsIcon = document.createElement('span')

    runTestStepsIcon.className = 'fas fa-sm fa-clone'
    runTestStepsIcon.style.display = 'table-cell'
    runTestStepsIcon.style.cursor = 'pointer'
    runTestStepsIcon.style.color = 'rgb(0, 159, 200)'
    runTestStepsIcon.style.textAlign = 'right'
    runTestStepsIcon.style.paddingRight = '5px'

    f.querySelector('.summary').appendChild(runTestStepsIcon)

    runTestStepsIcon.addEventListener('click', async () => {
      if (!f.parentElement.querySelector('.test')) {
        f.querySelector('.toggle > span').click() // expand the tests (only if not already expanded)
      }
      
      const tests = f.parentElement.querySelectorAll('.test')

      const lastTest = tests[tests.length - 1]
      runTest(f, lastTest, 1500)
    })


    const runTestIcon = document.createElement('span')

    runTestIcon.className = 'fas fa-sm fa-bullseye test-bullseye'
    runTestIcon.style.display = 'table-cell'
    runTestIcon.style.cursor = 'pointer'
    runTestIcon.style.color = 'rgb(12, 245, 255)'
    runTestIcon.style.textAlign = 'right'

    f.querySelector('.summary').appendChild(runTestIcon)

    runTestIcon.addEventListener('click', async () => {
      if (!f.parentElement.querySelector('.test')) {
        f.querySelector('.toggle > span').click() // expand the tests (only if not already expanded)
      }
      
      const tests = f.parentElement.querySelectorAll('.test')

      const lastTest = tests[tests.length - 1]
      runTest(f, lastTest, 0)
    })


    f.hasIcons = true
  }
}



// api

baseUrl = 'http://localhost:3000/api/'


openEventFile = (t) => {
  const namespace = parseNamespace(t.textContent)
  callRespond('developer', 'openEventsFile', [{ namespace }])
}

runTest = (f, t, delay) => {
  const filename = f.textContent.split('.js')[0] + '.js'
  const index = parseEventNum(t.textContent)
  callRespond('developer', 'runTest', [{ filename, index, delay }])
}


// helpers

parseEventNum = testName => {
  const reg = /^(\d+)/
  const match = reg.exec(testName)
  return match && parseInt(match[1])
}

parseNamespace = testName => {
  const reg = /^\d+\. (.+)\//
  const match = reg.exec(testName)
  return match && match[1]
}



// bootstrap

setInterval(addRespondButtons, 2000) // run on intervals, in case more tests are added
addRespondButtons()

console.log('Respond extension start')