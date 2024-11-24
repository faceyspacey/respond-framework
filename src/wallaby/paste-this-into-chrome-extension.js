// HOW TO:

// 1) DOWNLOAD THIS CHROME EXTENSION: https://chrome.google.com/webstore/detail/run-javascript/lmilalhkkdhfieeienjbiicclobibjao
// 2) while on https://wallabyjs.com/app/#/tests, click the extension's button in the toolbar, and paste the below code

// NOTE: ./extension.js will be fetched + evaled fresh on open of Wallaby Explorer, and therefore allow you to edit that code, while ensuring the Chrome Extension is always up to date
// NOTE: Wallaby Explorer can run on multiple URLs. For the Chrome Extension to work, it must be run on the https version of this URL: https://wallabyjs.com/app/#/tests (not the localhost version, and again, it MUST BE HTTPS! for cors to work)

window.callRespond = async (table, method, args = []) => {
  const url = `http://localhost:3000/api/${table}/${method}`
  const context = { table, method, args }
  
  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(context),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  })

  return res.json()
}


const fetchExtension = async () => {
  const { extension } = await callRespond('developer', 'getWallabyChromeExtensionCode')
  eval(extension)
}


fetchExtension()