const { test, expect } = require('@playwright/test')
const riskContractArtifact = require('../../src/contract-artifact.js')
const runtimeErrorsByPage = new WeakMap()

test.beforeEach(async ({ page }) => {
  const runtimeErrors = []
  runtimeErrorsByPage.set(page, runtimeErrors)
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
})

test.afterEach(async ({ page }) => {
  const runtimeErrors = runtimeErrorsByPage.get(page) || []
  expect(runtimeErrors, `Browser runtime errors:\n${runtimeErrors.join('\n')}`).toEqual([])
})

test('analyst can compare a 42-day response strategy and inspect evidence', async ({ page }, testInfo) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: '绝区零地区发行风险沙盘' })).toBeVisible()
  await expect(page.getByTestId('cycle-days')).toHaveText('42')
  await expect(page.getByTestId('claim-type')).toContainText('情景指数')

  const finalRisk = page.getByTestId('candidate-final-risk')
  await expect(finalRisk).toHaveText(/^\d+(?:\.\d+)?$/)
  const originalFinalRisk = Number(await finalRisk.textContent())
  await page.getByLabel('透明度').fill('0')
  await expect(finalRisk).not.toHaveText(String(originalFinalRisk))
  await expect(finalRisk).toHaveText(/^\d+(?:\.\d+)?$/)
  const reducedTransparencyRisk = Number(await finalRisk.textContent())
  expect(reducedTransparencyRisk).toBeGreaterThan(originalFinalRisk)

  const chartPaths = page.locator('#risk-chart .chart-path')
  await expect(chartPaths).toHaveCount(2)
  await expect(chartPaths.first()).toHaveAttribute('d', /^M.+L/)
  await page.screenshot({
    path: `artifacts/screenshots/overview-${testInfo.project.name}.png`,
    fullPage: true,
  })

  await page.getByRole('tab', { name: '证据库' }).click()
  await expect(page.getByText('Threshold Models of Collective Behavior')).toBeVisible()
  await expect(page.getByText('B 级 · 专业媒体转述')).toBeVisible()
})

test('wallet flow reports absence without exposing key inputs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Injective' }).click()

  await expect(page.locator('#panel-injective').getByRole('heading', { name: 'Injective EVM Testnet' })).toBeVisible()
  await expect(page.locator('input[name="privateKey"]')).toHaveCount(0)
  await page.getByTestId('connect-wallet').click()
  await expect(page.getByTestId('wallet-status')).toContainText('未检测到')
})

test('wallet flow connects to Injective testnet with an injected provider', async ({ page }) => {
  await page.addInitScript(({ runtimeCode }) => {
    window.__walletCalls = []
    window.ethereum = {
      request: async (request) => {
        window.__walletCalls.push(request)
        if (request.method === 'eth_chainId') return '0x59f'
        if (request.method === 'eth_getCode') return runtimeCode
        if (request.method === 'eth_sendTransaction') return `0x${'cd'.repeat(32)}`
        if (request.method === 'eth_requestAccounts') {
          return ['0x1111111111111111111111111111111111111111']
        }
        return null
      },
    }
  }, { runtimeCode: riskContractArtifact.deployedBytecode })
  await page.goto('/')
  await page.getByRole('tab', { name: 'Injective' }).click()
  await page.getByTestId('connect-wallet').click()

  await expect(page.getByTestId('wallet-status')).toContainText('0x1111')
  await page.getByLabel('RiskCommitment 合约地址').fill('0x2222222222222222222222222222222222222222')
  await expect(page.getByRole('button', { name: '提交链上记录' })).toBeEnabled()
  await expect(page.locator('#contract-help')).toContainText('合约代码核验通过')
  await page.getByRole('button', { name: '提交链上记录' }).click()
  await expect(page.locator('#transaction-result')).toContainText('风险承诺已提交')
  const walletCalls = await page.evaluate(() => window.__walletCalls)
  expect(walletCalls.map((call) => call.method)).toEqual([
    'eth_chainId',
    'eth_requestAccounts',
    'eth_getCode',
    'eth_chainId',
    'eth_getCode',
    'eth_sendTransaction',
  ])
  expect(walletCalls.at(-1).params[0].data).toMatch(/^0xa088e5a7/)
})

test('mobile dashboard has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only layout assertion')
  await page.goto('/')

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  await expect(page.getByRole('heading', { name: '绝区零地区发行风险沙盘' })).toBeVisible()
})

test('pitch deck fits target viewports and supports keyboard navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'viewport matrix runs once')
  const pitchPath = '/roadshow/beta0.1/'
  const viewports = [
    { name: 'wide', width: 1920, height: 1080 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'phone', width: 375, height: 667 },
    { name: 'landscape-phone', width: 667, height: 375 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto(pitchPath)
    const overflow = await page.locator('.slide').evaluateAll((slides) => slides.map((slide, index) => ({
      index,
      horizontal: slide.scrollWidth - slide.clientWidth,
      vertical: slide.scrollHeight - slide.clientHeight,
    })).filter((slide) => slide.horizontal > 1 || slide.vertical > 1))
    expect(overflow, `${viewport.name} slide overflow`).toEqual([])
  }

  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(pitchPath)
  await expect(page).toHaveTitle(/路演 Beta 0\.1/)
  await expect(page.locator('.brand img')).toHaveJSProperty('complete', true)
  await expect(page.locator('.demo-link').first()).toHaveAttribute('href', '../../index.html')
  await expect(page.getByText('1 / 10', { exact: true })).toBeVisible()
  await expect(page.locator('#slide-1')).toHaveClass(/is-active/)
  await expect(page.locator('#slide-1 [data-reveal]').last()).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'artifacts/screenshots/pitch-title.png' })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('2 / 10', { exact: true })).toBeVisible()
  await expect(page.locator('#slide-2')).toHaveClass(/is-active/)
  await page.keyboard.press('End')
  await expect(page.getByText('10 / 10', { exact: true })).toBeVisible()
  await expect(page.locator('#slide-10')).toHaveClass(/is-active/)
  await expect(page.locator('#slide-10')).toBeInViewport()
  await expect(page.locator('#slide-10 [data-reveal]').last()).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'artifacts/screenshots/pitch-final.png' })

  await page.setViewportSize({ width: 667, height: 375 })
  await page.goto(`${pitchPath}#slide-8`)
  await expect(page.locator('#slide-8')).toHaveClass(/is-active/)
  await expect(page.locator('#slide-8 [data-reveal]').last()).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'artifacts/screenshots/pitch-landscape-phone.png' })
})

test('standalone 3D observer renders and replays the full 42-day evolution', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop interaction and pixel audit')
  await page.goto('/simulation/')

  await expect(page.getByRole('heading', { name: '发行影响演化观察器' })).toBeVisible()
  await expect(page.getByTestId('simulation-data-status')).toHaveText('数据已校验')
  await expect(page.getByTestId('simulation-day')).toHaveText('01 / 42')
  const canvas = page.locator('#simulation-canvas')
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  expect(box.width).toBeGreaterThan(700)
  expect(box.height).toBeGreaterThan(420)

  const pixelStats = await page.evaluate(() => window.__evolutionDiagnostics.pixelStats())
  expect(pixelStats.opaqueRatio).toBeGreaterThan(0.95)
  expect(pixelStats.colorBuckets).toBeGreaterThan(12)
  expect(pixelStats.luminanceRange).toBeGreaterThan(25)
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name))
  expect(requests.some((url) => url.includes('/roadshow/'))).toBe(false)

  const dataContract = await page.evaluate(() => ({
    artifactVersion: window.__evolutionDiagnostics.artifactVersion(),
    capabilities: window.__evolutionDiagnostics.sensitivityCapabilities(),
    day42: window.__evolutionDiagnostics.sensitivityDay('delta', 42),
  }))
  expect(dataContract.artifactVersion).toBe('visual-data-beta0.3')
  expect(dataContract.capabilities.dailyAggregateBands).toBe(true)
  expect(dataContract.capabilities.perAgentBands).toBe(false)
  expect(dataContract.day42.risk.p10).toBeLessThanOrEqual(dataContract.day42.risk.p50)
  expect(dataContract.day42.risk.p50).toBeLessThanOrEqual(dataContract.day42.risk.p90)
  expect(dataContract.day42.risk.p50).toBeLessThan(0)

  const point = await page.evaluate(() => window.__evolutionDiagnostics.agentScreenPoint('S063'))
  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('selected-agent-id')).toHaveText('S063')

  await page.getByTestId('playback-toggle').click()
  await expect(page.getByTestId('simulation-day')).not.toHaveText('01 / 42', { timeout: 5000 })
  await page.getByTestId('playback-toggle').click()

  await page.locator('#timeline-range').evaluate((element) => {
    element.value = '25'
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.getByTestId('simulation-day')).toHaveText('25 / 42')
  await expect(page.getByTestId('active-event')).toContainText('角色机制修复后回退')
  await page.getByTestId('view-delta').click()
  await expect(page.getByTestId('aggregate-risk')).toContainText('-')
  await page.screenshot({ path: 'artifacts/screenshots/simulation-3d-desktop.png', fullPage: true })
})

test('standalone 3D observer fits the mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only 3D layout assertion')
  await page.goto('/simulation/')
  await expect(page.getByTestId('simulation-data-status')).toHaveText('数据已校验')
  await expect(page.locator('#simulation-canvas')).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  const pixelStats = await page.evaluate(() => window.__evolutionDiagnostics.pixelStats())
  expect(pixelStats.colorBuckets).toBeGreaterThan(8)
  await page.screenshot({ path: 'artifacts/screenshots/simulation-3d-mobile.png', fullPage: true })
})
