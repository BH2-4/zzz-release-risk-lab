'use strict';

(() => {
  const model = globalThis.ZZZRiskModel
  const chain = globalThis.ZZZInjective
  const artifact = globalThis.ZZZRiskContract
  if (!model || !chain || !artifact) throw new Error('Core modules failed to load')

  const scenarios = {
    'mechanics-rollback': {
      id: 'mechanics-rollback',
      label: '角色机制修复回退',
      description: '长期存在的角色操作被修复后，玩家可能将其重新框定为程序不公。',
      evidence: 'B 级',
      evidenceClass: 'evidence-badge--b',
      eventDay: 18,
      controllability: 0.92,
      priorCrisis: 0.42,
      triggers: { economic: 0.68, political: 0.08, cultural: 0.16, social: 0.72, internet: 0.86 },
    },
    'reward-gap': {
      id: 'reward-gap',
      label: '周年奖励期待落差',
      description: '长期投入、商业成功与周年回馈被放在同一比较框架中，形成公平感落差。',
      evidence: 'C 级 · 夹具',
      evidenceClass: 'evidence-badge--c',
      eventDay: 25,
      controllability: 0.9,
      priorCrisis: 0.55,
      triggers: { economic: 0.82, political: 0.08, cultural: 0.28, social: 0.74, internet: 0.92 },
    },
    representation: {
      id: 'representation',
      label: '文化代表争议',
      description: '全球文化素材进入角色设计后，不同群体可能围绕代表性与尊重形成竞争框架。',
      evidence: 'C 级 · 待复核',
      evidenceClass: 'evidence-badge--c',
      eventDay: 14,
      controllability: 0.68,
      priorCrisis: 0.38,
      triggers: { economic: 0.12, political: 0.48, cultural: 0.92, social: 0.8, internet: 0.87 },
    },
  }

  const baselineResponse = {
    id: 'silence',
    delayDays: 8,
    transparency: 0,
    participation: 0,
    restitution: 0,
    localization: 0,
    correctiveAction: 0,
  }
  const defaults = { delay: 1, transparency: 90, participation: 55, restitution: 85, localization: 70, correctiveAction: 95 }
  const seedByScenario = { 'mechanics-rollback': 20260731, 'reward-gap': 20260723, representation: 20260807 }
  const labels = {
    economic: '经济', political: '政治', cultural: '文化', social: '社会', internet: '互联网',
    individual: '个人', group: '群体', region: '地区', country: '国家', international: '国际',
    'east-asia': '东亚', 'north-america': '北美', europe: '欧洲', 'southeast-asia': '东南亚', 'latin-america': '拉丁美洲',
  }

  const controls = {
    scenario: document.querySelector('#scenario-select'),
    delay: document.querySelector('#delay'),
    transparency: document.querySelector('#transparency'),
    participation: document.querySelector('#participation'),
    restitution: document.querySelector('#restitution'),
    localization: document.querySelector('#localization'),
    correctiveAction: document.querySelector('#corrective-action'),
  }

  let currentResult = null
  let currentHash = null
  let walletAccount = null
  let contractVerified = false
  let contractVerificationRevision = 0
  let renderRevision = 0
  let scheduledRender = null

  function number(value) {
    return Number(value) / 100
  }

  function candidateResponse() {
    return {
      id: 'analyst-response',
      delayDays: Number(controls.delay.value),
      transparency: number(controls.transparency.value),
      participation: number(controls.participation.value),
      restitution: number(controls.restitution.value),
      localization: number(controls.localization.value),
      correctiveAction: number(controls.correctiveAction.value),
    }
  }

  function setText(selector, value) {
    document.querySelector(selector).textContent = value
  }

  function formatRisk(value) {
    return Number(value).toFixed(1)
  }

  function riskBand(value) {
    return Math.max(1, Math.min(5, Math.ceil(value / 20)))
  }

  function updateOutputs() {
    setText('#delay-output', `${controls.delay.value} 天`)
    for (const key of ['transparency', 'participation', 'restitution', 'localization', 'correctiveAction']) {
      const outputId = key === 'correctiveAction' ? '#corrective-action-output' : `#${key}-output`
      setText(outputId, controls[key].value)
    }
  }

  function linePath(timeline, width, height, padding) {
    return timeline.map((point, index) => {
      const x = padding.left + (index / (timeline.length - 1)) * (width - padding.left - padding.right)
      const y = padding.top + ((100 - point.risk) / 100) * (height - padding.top - padding.bottom)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }

  function renderChart(baseline, candidate, eventDay) {
    const width = 900
    const height = 330
    const padding = { top: 18, right: 14, bottom: 18, left: 34 }
    const plotHeight = height - padding.top - padding.bottom
    const eventX = padding.left + ((eventDay - 1) / 41) * (width - padding.left - padding.right)
    const grids = [0, 25, 50, 75, 100].map((value) => {
      const y = padding.top + ((100 - value) / 100) * plotHeight
      return `<line class="chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line><text class="chart-label" x="2" y="${y + 3}">${value}</text>`
    }).join('')
    const candidatePath = linePath(candidate.timeline, width, height, padding)
    const baselinePath = linePath(baseline.timeline, width, height, padding)
    const areaPath = `${candidatePath} L${width - padding.right},${height - padding.bottom} L${padding.left},${height - padding.bottom} Z`
    const svg = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        ${grids}
        <path class="chart-area" d="${areaPath}"></path>
        <line class="chart-event" x1="${eventX}" y1="${padding.top}" x2="${eventX}" y2="${height - padding.bottom}"></line>
        <path class="chart-path chart-path--baseline" d="${baselinePath}"></path>
        <path class="chart-path chart-path--candidate" d="${candidatePath}"></path>
      </svg>`
    const chart = document.querySelector('#risk-chart')
    chart.innerHTML = svg
    chart.setAttribute('aria-label', `42 天风险曲线。沉默方案峰值 ${formatRisk(baseline.peakRisk)}，当前方案峰值 ${formatRisk(candidate.peakRisk)}`)
    setText('#event-day-label', `第 ${eventDay} 天事件`)
  }

  function barTone(value) {
    if (value >= 35) return 'bar-fill--hot'
    if (value >= 18) return 'bar-fill--warm'
    return ''
  }

  function renderBars(containerId, values) {
    const container = document.querySelector(containerId)
    container.replaceChildren(...Object.entries(values)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => {
        const item = document.createElement('div')
        item.className = 'bar-item'
        const meta = document.createElement('div')
        meta.className = 'bar-item__meta'
        const name = document.createElement('span')
        name.textContent = labels[key] || key
        const score = document.createElement('span')
        score.textContent = formatRisk(value)
        const track = document.createElement('div')
        track.className = 'bar-track'
        const fill = document.createElement('div')
        fill.className = `bar-fill ${barTone(value)}`
        fill.style.width = `${Math.max(0, Math.min(100, value))}%`
        track.append(fill)
        meta.append(name, score)
        item.append(meta, track)
        return item
      }))
  }

  function renderDecision(comparison, band) {
    const improvement = -comparison.finalRiskDelta
    if (improvement >= 20) {
      setText('#decision-title', '快速纠正显著优于沉默，但仍有残余压力')
      setText('#decision-copy', '保留解释、纠正与补偿组合；把剩余资源投向当前最高的两个领域，并监测事件后二次扩散。')
    } else if (improvement >= 8) {
      setText('#decision-title', '当前方案有效，但响应组合仍可加强')
      setText('#decision-copy', '缩短延迟或提高透明度与纠正行动，优先验证结论是否跨 100 次扰动仍成立。')
    } else {
      setText('#decision-title', '当前方案相对沉默没有形成稳定优势')
      setText('#decision-copy', '不要提交单点结论；先补足纠正行动、解释和地区适配，再运行对照。')
    }
    setText('#risk-band', `${band} / 5`)
    setText('#commit-risk-band', `${band} / 5`)
  }

  async function updateHash(revision, scenario, response, candidate, band) {
    const hash = await chain.createScenarioHash({
      model: 'programE-v0.2',
      scenarioId: scenario.id,
      eventDay: scenario.eventDay,
      response,
      peakRisk: candidate.peakRisk,
      finalRisk: candidate.finalRisk,
      riskBand: band,
      seed: seedByScenario[scenario.id],
    })
    if (revision !== renderRevision) return
    currentHash = hash
    setText('#scenario-hash', `${hash.slice(0, 12)}…${hash.slice(-10)}`)
    updateCommitAvailability()
  }

  function renderSimulation() {
    scheduledRender = null
    const scenario = scenarios[controls.scenario.value]
    const response = candidateResponse()
    const seed = seedByScenario[scenario.id]
    const population = model.createPopulation({ size: 125, seed })
    const comparison = model.compareResponses({
      scenario,
      baselineResponse,
      candidateResponse: response,
      population,
      seed: seed + 19,
    })
    const uncertainty = model.runEnsemble({ scenario, response, runs: 100, populationSize: 125, seed: seed + 41 })
    const band = riskBand(comparison.candidate.peakRisk)
    currentResult = { scenario, response, comparison, uncertainty, band }
    renderRevision += 1
    currentHash = null

    setText('#active-scenario-title', scenario.label)
    setText('#scenario-description', scenario.description)
    const badge = document.querySelector('#scenario-evidence')
    badge.textContent = scenario.evidence
    badge.className = `evidence-badge ${scenario.evidenceClass}`
    setText('#baseline-peak-risk', formatRisk(comparison.baseline.peakRisk))
    setText('#candidate-peak-risk', formatRisk(comparison.candidate.peakRisk))
    setText('#candidate-final-risk', formatRisk(comparison.candidate.finalRisk))
    setText('#peak-delta', `${comparison.peakRiskDelta > 0 ? '+' : ''}${formatRisk(comparison.peakRiskDelta)} vs 沉默`)
    setText('#final-delta', `${comparison.finalRiskDelta > 0 ? '+' : ''}${formatRisk(comparison.finalRiskDelta)} vs 沉默`)
    setText('#uncertainty-range', `${formatRisk(uncertainty.finalRisk.p10)}–${formatRisk(uncertainty.finalRisk.p90)}`)

    renderChart(comparison.baseline, comparison.candidate, scenario.eventDay)
    renderBars('#domain-bars', comparison.candidate.byDomain)
    renderBars('#level-bars', comparison.candidate.byLevel)
    renderBars('#region-bars', comparison.candidate.byRegion)
    renderDecision(comparison, band)
    setText('#scenario-hash', '计算中…')
    updateHash(renderRevision, scenario, response, comparison.candidate, band)
  }

  function scheduleSimulation() {
    updateOutputs()
    if (scheduledRender) cancelAnimationFrame(scheduledRender)
    scheduledRender = requestAnimationFrame(renderSimulation)
  }

  function selectTab(button) {
    for (const tab of document.querySelectorAll('[role="tab"]')) {
      const selected = tab === button
      tab.setAttribute('aria-selected', String(selected))
      document.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden = !selected
    }
  }

  function shortAddress(address) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }

  function setWalletStatus(message, error = false) {
    const status = document.querySelector('#wallet-status')
    status.textContent = message
    status.style.color = error ? '#a43b29' : ''
  }

  function validContractAddress() {
    return /^0x[0-9a-fA-F]{40}$/.test(document.querySelector('#contract-address').value.trim())
  }

  function updateCommitAvailability() {
    document.querySelector('#deploy-contract').disabled = !walletAccount || !artifact?.bytecode
    document.querySelector('#commit-risk').disabled = !walletAccount || !currentHash || !contractVerified
  }

  async function verifyContractAddress() {
    const revision = ++contractVerificationRevision
    const address = document.querySelector('#contract-address').value.trim()
    const help = document.querySelector('#contract-help')
    contractVerified = false
    updateCommitAvailability()

    if (!validContractAddress()) {
      help.textContent = '部署完成后填入地址；提交按钮只接受 40 位 EVM 地址。'
      return false
    }
    if (!walletAccount) {
      help.textContent = '先连接钱包，再核验该地址是否为本项目合约。'
      return false
    }

    help.textContent = '正在读取链上运行时代码…'
    try {
      const verified = await chain.verifyRiskContract(globalThis.ethereum, address, artifact.deployedBytecode)
      if (revision !== contractVerificationRevision) return false
      contractVerified = verified
      help.textContent = verified
        ? '合约代码核验通过，可以提交风险承诺。'
        : '该地址不是本项目编译出的 RiskCommitment 合约。'
      updateCommitAvailability()
      return verified
    } catch (error) {
      if (revision !== contractVerificationRevision) return false
      help.textContent = `合约核验失败：${error.message || '钱包未返回链上代码'}`
      updateCommitAvailability()
      return false
    }
  }

  async function connectBrowserWallet() {
    if (!globalThis.ethereum) {
      setWalletStatus('未检测到浏览器钱包，请安装或启用 MetaMask。', true)
      return null
    }
    try {
      setWalletStatus('等待钱包确认 Injective 测试网…')
      walletAccount = await chain.connectWallet(globalThis.ethereum)
      setWalletStatus(`已连接 ${shortAddress(walletAccount)} · Injective 1439`)
      document.querySelector('#connect-wallet').textContent = '钱包已连接'
      updateCommitAvailability()
      await verifyContractAddress()
      return walletAccount
    } catch (error) {
      setWalletStatus(`连接失败：${error.message || '钱包拒绝请求'}`, true)
      return null
    }
  }

  function renderTransactionLink(hash, label) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash || '')) throw new TypeError('Wallet returned an invalid transaction hash')
    const link = document.createElement('a')
    link.href = `${chain.getInjectiveTestnetConfig().blockExplorerUrls[0]}tx/${hash}`
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.textContent = `${label}：${hash}`
    document.querySelector('#transaction-result').replaceChildren(link)
  }

  async function deployContract() {
    if (!walletAccount && !(await connectBrowserWallet())) return
    try {
      await chain.ensureInjectiveTestnet(globalThis.ethereum)
      document.querySelector('#deploy-contract').disabled = true
      setWalletStatus('等待钱包签署合约部署交易…')
      const transactionHash = await globalThis.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAccount, data: artifact.bytecode, value: '0x0' }],
      })
      renderTransactionLink(transactionHash, '部署交易已提交')
      setWalletStatus('部署交易已提交。确认后从 Blockscout 复制合约地址。')
    } catch (error) {
      setWalletStatus(`部署失败：${error.message || '钱包拒绝交易'}`, true)
    } finally {
      updateCommitAvailability()
    }
  }

  async function commitRisk() {
    if (!walletAccount && !(await connectBrowserWallet())) return
    const contractAddress = document.querySelector('#contract-address').value.trim()
    try {
      await chain.ensureInjectiveTestnet(globalThis.ethereum)
      if (!(await verifyContractAddress())) {
        throw new TypeError('Contract code verification is required before committing')
      }
      const transaction = chain.buildCommitTransaction({
        account: walletAccount,
        contractAddress,
        scenarioHash: currentHash,
        riskBand: currentResult.band,
        stakeInj: document.querySelector('#stake-amount').value,
      })
      document.querySelector('#commit-risk').disabled = true
      setWalletStatus('等待钱包签署风险承诺…')
      const transactionHash = await globalThis.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      })
      renderTransactionLink(transactionHash, '风险承诺已提交')
      setWalletStatus('交易已提交，可在 Blockscout 核验事件。')
    } catch (error) {
      setWalletStatus(`提交失败：${error.message || '钱包拒绝交易'}`, true)
    } finally {
      updateCommitAvailability()
    }
  }

  function resetControls() {
    controls.scenario.value = 'mechanics-rollback'
    for (const [key, value] of Object.entries(defaults)) controls[key].value = String(value)
    scheduleSimulation()
  }

  for (const control of Object.values(controls)) control.addEventListener('input', scheduleSimulation)
  for (const tab of document.querySelectorAll('[role="tab"]')) tab.addEventListener('click', () => selectTab(tab))
  document.querySelector('#reset-controls').addEventListener('click', resetControls)
  document.querySelector('#rerun-simulation').addEventListener('click', renderSimulation)
  document.querySelector('#connect-wallet').addEventListener('click', connectBrowserWallet)
  document.querySelector('#deploy-contract').addEventListener('click', deployContract)
  document.querySelector('#commit-risk').addEventListener('click', commitRisk)
  document.querySelector('#contract-address').addEventListener('input', verifyContractAddress)

  updateOutputs()
  renderSimulation()
})()
