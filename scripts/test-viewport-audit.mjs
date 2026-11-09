import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import os from 'os'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function createStaticServer(distDir, port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url.split('?')[0])
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html')
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = mimeTypes[ext] || 'application/octet-stream'

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500)
        res.end('Error loading file')
      } else {
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(content, 'utf-8')
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server)
    })
  })
}

async function runAudit() {
  console.log('======================================================================')
  console.log('      DUALZONE VIEWPORT & RESPONSIVENESS AUDIT (360x800 & 390x844)     ')
  console.log('======================================================================\n')

  const distDir = path.resolve('dist')
  if (!fs.existsSync(distDir)) {
    console.error('dist directory does not exist! Please run npm run build first.')
    process.exit(1)
  }

  console.log('[1/4] Starting Built-in Production HTTP Server on 127.0.0.1:4173...')
  const server = await createStaticServer(distDir, 4173)
  console.log('✅ Server running serving dist/.\n')

  console.log('[2/4] Starting Headless Chrome with Chrome DevTools Protocol...')
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const debugPort = 9222
  const tempProfile = path.join(os.tmpdir(), 'dz-audit-profile-' + Date.now())

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + tempProfile,
    '--window-size=360,800',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ])

  await sleep(2500)

  const versionRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
  const tabs = await versionRes.json()
  const pageTab = tabs.find(t => t.type === 'page') || tabs[0]
  const wsUrl = pageTab.webSocketDebuggerUrl

  const ws = new WebSocket(wsUrl)
  await new Promise((res, rej) => {
    ws.onopen = res
    ws.onerror = rej
  })

  let id = 1
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++
    const timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 8000)
    const handler = (event) => {
      const data = JSON.parse(event.data)
      if (data.id === msgId) {
        clearTimeout(timer)
        ws.removeEventListener('message', handler)
        resolve(data.result)
      }
    }
    ws.addEventListener('message', handler)
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })

  await send('Page.enable')
  await send('Runtime.enable')

  console.log('✅ Connected to Chrome CDP session.\n')

  const viewports = [
    { name: '360x800 (Compact Mobile)', width: 360, height: 800, mobile: true },
    { name: '390x844 (Standard Mobile)', width: 390, height: 844, mobile: true },
    { name: '1280x800 (Desktop Laptop)', width: 1280, height: 800, mobile: false },
  ]

  const routes = [
    { path: '/study/home', name: 'Study Home' },
    { path: '/study/jee-mains', name: 'JEE Mains Subject' },
    { path: '/study/jee-advanced', name: 'JEE Advanced Subject' },
    { path: '/study/neet', name: 'NEET Subject' },
    { path: '/study/ca', name: 'CA Subject' },
    { path: '/study/chatbot', name: 'Chatbot Gateway (Decoy)' },
    { path: '/study/notes', name: 'Study Notes' },
    { path: '/study/quiz', name: 'Quiz Page' },
    { path: '/study/progress', name: 'Progress Tracker' },
    { path: '/login', name: 'Login Screen' },
    { path: '/register', name: 'Register Screen' },
    { path: '/switching', name: 'Study Transition' },
  ]

  console.log('[3/4] Testing Viewports & Routes...')
  const auditResults = []

  for (const vp of viewports) {
    console.log(`\n▶ Testing Viewport: ${vp.name}`)
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: vp.mobile,
    })

    for (const r of routes) {
      const url = `http://127.0.0.1:4173${r.path}`
      await send('Page.navigate', { url })
      await sleep(1000)

      const evalRes = await send('Runtime.evaluate', {
        expression: `JSON.stringify({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          scrollHeight: document.documentElement.scrollHeight,
          innerHeight: window.innerHeight,
          hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
          overflowDiff: document.documentElement.scrollWidth - window.innerWidth,
        })`,
        returnByValue: true,
      })

      const metrics = JSON.parse(evalRes?.result?.value || '{}')
      const pass = metrics.scrollWidth <= metrics.innerWidth

      auditResults.push({
        viewport: `${vp.width}x${vp.height}`,
        route: r.path,
        name: r.name,
        innerWidth: `${metrics.innerWidth}px`,
        scrollWidth: `${metrics.scrollWidth}px`,
        overflow: metrics.hasHScroll ? `+${metrics.overflowDiff}px` : '0px',
        status: pass ? 'PASS' : 'FAIL',
      })
    }
  }

  // Close connections
  ws.close()
  chrome.kill()
  server.close()

  console.log('\n[4/4] ================================================================')
  console.log('                    VIEWPORT AUDIT REPORT                             ')
  console.log('======================================================================')
  console.table(auditResults.filter(r => r.viewport === '360x800'))

  const failedItems = auditResults.filter(r => r.status === 'FAIL')
  if (failedItems.length === 0) {
    console.log('\n🎯 ALL 36 TESTS PASSED: document.documentElement.scrollWidth <= window.innerWidth is 100% TRUE across all routes!')
  } else {
    console.error(`\n❌ ${failedItems.length} routes failed viewport constraints:`, failedItems)
  }
}

runAudit().catch(err => {
  console.error('Fatal error during audit:', err)
  process.exit(1)
})
