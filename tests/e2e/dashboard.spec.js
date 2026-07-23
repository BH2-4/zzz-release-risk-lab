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
