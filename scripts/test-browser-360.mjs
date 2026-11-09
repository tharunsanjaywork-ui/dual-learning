import { spawn } from 'child_process'
import os from 'os'
import path from 'path'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const debugPort = 9222
  const tempProfile = path.join(os.tmpdir(), 'dz-chrome-profile-' + Date.now())

  console.log('1. Starting Vite preview server...')
  const preview = spawn('cmd.exe', ['/c', 'npx', 'vite', 'preview', '--port', '4173', '--strictPort'], {
    stdio: 'ignore'
  })
  await sleep(2500)

  console.log('2. Starting Chrome headless with isolated profile (360x800)...')
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + tempProfile,
    '--window-size=360,800',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'http://localhost:4173/'
  ], { stdio: 'ignore' })
  await sleep(3500)

  try {
    const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
    const tabs = await listRes.json()
    const tab = tabs.find(t => t.type === 'page') || tabs[0]
    if (!tab || !tab.webSocketDebuggerUrl) {
      throw new Error('No page WebSocket URL found in ' + JSON.stringify(tabs))
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      ws.onopen = res
      ws.onerror = rej
    })

    let id = 1
    const send = (method, params = {}) => new Promise((resolve) => {
      const msgId = id++
      const handler = (event) => {
        const data = JSON.parse(event.data)
        if (data.id === msgId) {
          ws.removeEventListener('message', handler)
          resolve(data.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })

    await send('Page.enable')
    await send('Runtime.enable')

    await send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true,
    })

    const routesToTest = [
      'http://localhost:4173/study/home',
      'http://localhost:4173/study/jee-mains',
      'http://localhost:4173/study/jee-advanced',
      'http://localhost:4173/study/neet',
      'http://localhost:4173/study/ca',
      'http://localhost:4173/study/chatbot',
      'http://localhost:4173/study/notes',
      'http://localhost:4173/study/quiz',
      'http://localhost:4173/study/progress',
      'http://localhost:4173/login',
      'http://localhost:4173/register',
    ]

    console.log('\n======================================================================')
    console.log('           BROWSER TESTING AT 360x800 (CHROME HEADLESS)              ')
    console.log('======================================================================\n')

    for (const url of routesToTest) {
      await send('Page.navigate', { url })
      await sleep(1500)

      const evalRes = await send('Runtime.evaluate', {
        expression: `JSON.stringify({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          title: document.title,
          hasHScroll: document.documentElement.scrollWidth > window.innerWidth
        })`,
        returnByValue: true
      })

      const metrics = JSON.parse(evalRes?.result?.value || '{}')
      const pass = metrics.scrollWidth <= metrics.innerWidth
      const pathName = new URL(url).pathname
      console.log(`${pass ? '✅ PASS' : '❌ FAIL'} [${pathName.padEnd(20)}] scrollWidth: ${metrics.scrollWidth}px, innerWidth: ${metrics.innerWidth}px, H-Scroll: ${metrics.hasHScroll}`)
    }

    ws.close()
  } catch (err) {
    console.error('Test error:', err)
  } finally {
    try { chrome.kill() } catch {}
    try { preview.kill() } catch {}
    spawn('cmd.exe', ['/c', 'taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq about:blank*"'], { stdio: 'ignore' })
  }
}

run()
