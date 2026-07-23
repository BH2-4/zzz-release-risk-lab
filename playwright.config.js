const { defineConfig, devices } = require('@playwright/test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

function localChromiumExecutable() {
  if (process.platform !== 'darwin') return undefined
  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if (fs.existsSync(systemChrome)) return systemChrome
  const cache = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright')
  if (!fs.existsSync(cache)) return undefined
  const build = fs.readdirSync(cache)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort()
    .at(-1)
  if (!build) return undefined
  const executable = path.join(cache, build, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
  return fs.existsSync(executable) ? executable : undefined
}

const executablePath = localChromiumExecutable()

module.exports = defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/playwright',
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
})
