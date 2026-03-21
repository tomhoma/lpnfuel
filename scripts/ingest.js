/**
 * lpnfuel ingest script (Windows)
 * Fetches fuel station data from Google Apps Script and POSTs to /ingest API.
 *
 * Setup (one-time):
 *   cd scripts
 *   npm install
 *   npx playwright install chromium
 *
 * Run:
 *   node ingest.js
 *   or double-click ingest.bat
 */

const { chromium } = require('playwright')
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

// Load .env file
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const val = trimmed.slice(idx + 1)
    if (!process.env[key]) process.env[key] = val
  }
}

const LOG_FILE = path.join(__dirname, 'ingest.log')

function log(msg) {
  const ts = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
  const line = `[${ts}] ${msg}`
  console.log(line)
  fs.appendFileSync(LOG_FILE, line + '\n')
}

const GAS_URL = process.env.GAS_URL
const API_URL = process.env.API_URL
const API_KEY = process.env.API_KEY
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '60000', 10)

if (!GAS_URL || !API_URL || !API_KEY) {
  console.error('Missing required env vars (GAS_URL, API_URL, API_KEY). See .env.example')
  process.exit(1)
}

async function fetchStationData() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  // Wait for the callback response that contains station data
  const stationJson = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout: no station data received within ' + TIMEOUT_MS + 'ms'))
    }, TIMEOUT_MS)

    page.on('response', async (response) => {
      const url = response.url()
      if (!url.includes('/callback')) return

      try {
        const text = await response.text()
        // Response format: )]}' followed by [["op.exec", [0, "<json>"]], ["di", N]]
        // or just [["op.exec", ...]]
        const cleaned = text.replace(/^\)\]\}'\s*\n?/, '')
        const parsed = JSON.parse(cleaned)
        if (
          Array.isArray(parsed) &&
          parsed[0] &&
          parsed[0][0] === 'op.exec' &&
          Array.isArray(parsed[0][1]) &&
          parsed[0][1][1]
        ) {
          clearTimeout(timer)
          const raw = parsed[0][1][1]
          // raw might be an escaped JSON string — unescape it
          const unescaped = raw.replace(/\\"/g, '"')
          const trimmed = unescaped.replace(/^"/, '').replace(/"$/, '')
          resolve(trimmed)
        }
      } catch (_) {
        // Not the response we're looking for, keep waiting
      }
    })

    console.log('Opening GAS URL...')
    page.goto(GAS_URL, { timeout: TIMEOUT_MS }).catch((err) => {
      // Navigation errors are OK if we already got the data via callback
    })
  })

  await browser.close()
  return stationJson
}

function postToIngest(json) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}/ingest`)
    const isHttps = url.protocol === 'https:'
    const lib = isHttps ? https : http

    const body = Buffer.from(json, 'utf8')
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Content-Length': body.length,
      },
    }

    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async () => {
  try {
    log('Fetching station data from GAS...')
    const json = await fetchStationData()

    const stations = JSON.parse(json)
    if (!Array.isArray(stations)) throw new Error('Expected a JSON array')
    log(`Got ${stations.length} stations. Sending to /ingest...`)

    const result = await postToIngest(json)
    const parsed = JSON.parse(result)
    log(`OK: ${parsed.stations_updated} stations updated`)
  } catch (err) {
    log(`ERROR: ${err.message}`)
    process.exit(1)
  }
})()
