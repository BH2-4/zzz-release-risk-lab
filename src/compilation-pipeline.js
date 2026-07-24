'use strict'

const { buildEvidencePack, validateEvidenceLedger } = require('./evidence-ledger.js')
const { digestValue } = require('./artifact-digest.js')
const {
  compileScenario,
  requiredNumericBindingPaths,
  validateCompiledScenario,
} = require('./scenario-compiler.js')
const { validateTheorySystem } = require('./theory-system.js')

const REQUIRED_TARGET_LANGUAGES = Object.freeze(['zh-CN', 'en', 'ja'])
const FIXED_VERTICAL_SLICE_ID = 'zzz-3-1-fade-risk-v1'
const FIXED_THEORY_SYSTEM_ID = 'theory-system:sha256:432e0f6273403bb3f4cae5afaac4ba61c6dde9a8e4e5e2b118a58c9427e84912'
const FIXED_SOURCE_DIGESTS = Object.freeze({
  approvedExtractions: 'sha256:f9a216da460893abc01de40844295e51a2f638f89a292056420bb24f87ea1ec1',
  evidenceReview: 'sha256:493e99eaf49090ee48211fed824a91d78af8d922db3f6c3e456656e5da1762d8',
  ledger: 'sha256:f3c80f1881c2e75583a0cd76c20ba5df6f5e603de926361ceb6b1e6ba6690e05',
  theoryCatalog: 'sha256:9296e439d7a610302bc7e0ae19afc7c95697af99d4a85265cb2f73ca9b93f3e6',
  theoryRun: 'sha256:8358bbc0d1f1526911f58e69b72dfd99a3bcd7def3afbbb666ba66e4e87ac758',
  verticalSlice: 'sha256:e8ca8fad4e2a45ec4ac19a0b9b1f4bc7efc52f6178bb1c2bfbe4bb92b0b8f987',
  theorySystem: 'sha256:98f5cc12b66944d0326c255c7a73d7482a47846ab9e7ddd74610a093ba338fdc',
})
const SOURCE_LABELS = Object.freeze({
  approvedExtractions: 'Approved extractions',
  evidenceReview: 'Evidence review',
  ledger: 'Ledger',
  theoryCatalog: 'Theory catalog',
  theoryRun: 'Theory Agent run',
  verticalSlice: 'Vertical slice',
  theorySystem: 'Theory System',
})

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function validateVerticalSlice(verticalSlice) {
  const errors = []
  if (!verticalSlice || typeof verticalSlice !== 'object') return { valid: false, errors: ['Vertical slice is required'] }
  if (verticalSlice.schemaVersion !== 'vertical-slice/1.0') errors.push('Unsupported vertical slice schema')
  if (!isNonEmptyString(verticalSlice.id) || !isNonEmptyString(verticalSlice.title)) errors.push('Vertical slice requires id and title')
  if (!isNonEmptyString(verticalSlice.brief)) errors.push('Vertical slice requires brief')
  if (verticalSlice.scope?.game !== 'zenless-zone-zero') errors.push('Vertical slice game must be zenless-zone-zero')
  if (verticalSlice.scope?.scenarioType !== 'synthetic-counterfactual') errors.push('Vertical slice must be synthetic-counterfactual')
  if (verticalSlice.scope?.cycleDays !== 42) errors.push('Vertical slice cycleDays must be 42')
  if (verticalSlice.scope?.populationSize !== 125) errors.push('Vertical slice populationSize must be 125')
  const targetLanguages = verticalSlice.scope?.targetLanguages
  if (
    !Array.isArray(targetLanguages) ||
    REQUIRED_TARGET_LANGUAGES.some((language) => !targetLanguages.includes(language))
  ) {
    errors.push('Vertical slice target languages must include zh-CN, en, and ja')
  }
  if (!Array.isArray(verticalSlice.evidenceClaimIds) || verticalSlice.evidenceClaimIds.length === 0) {
    errors.push('Vertical slice requires evidence claim ids')
  }
  if (verticalSlice.theoryClaimIds !== undefined) {
    if (!Array.isArray(verticalSlice.theoryClaimIds) || verticalSlice.theoryClaimIds.length === 0) {
      errors.push('Vertical slice theoryClaimIds must be a non-empty array when provided')
    } else if (verticalSlice.theoryClaimIds.some((claimId) => !verticalSlice.evidenceClaimIds?.includes(claimId))) {
      errors.push('Vertical slice theoryClaimIds must be a subset of evidenceClaimIds')
    }
  }
  if (!Array.isArray(verticalSlice.boundaries) || verticalSlice.boundaries.length === 0) {
    errors.push('Vertical slice requires boundaries')
  }
  return { valid: errors.length === 0, errors }
}

function deriveEvidenceLanguageBoundary(evidencePack) {
  const sourcesById = new Map((evidencePack?.sources || []).map((source) => [source.id, source]))
  const claims = (evidencePack?.claims || []).map((claim) => {
    const directLanguages = REQUIRED_TARGET_LANGUAGES.filter((language) => {
      return claim.language === language && claim.sourceRefs.some((reference) => {
        const source = sourcesById.get(reference.sourceId)
        return source?.language === language && source?.verification?.status === 'direct'
      })
    })
    return {
      claimId: claim.id,
      directLanguages,
      unavailableDirectLanguages: REQUIRED_TARGET_LANGUAGES.filter(
        (language) => !directLanguages.includes(language),
      ),
    }
  })
  return {
    schemaVersion: 'evidence-language-boundary/1.0',
    reviewLanguages: [...REQUIRED_TARGET_LANGUAGES],
    claims,
  }
}

function exactJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function assertFixedAuthority({
  approvedExtractions, evidenceReview, ledger, theoryCatalog, theoryRun, theorySystem, verticalSlice,
}) {
  if (verticalSlice?.id !== FIXED_VERTICAL_SLICE_ID) {
    throw new TypeError(`Vertical slice must be ${FIXED_VERTICAL_SLICE_ID}`)
  }
  if (theorySystem?.id !== FIXED_THEORY_SYSTEM_ID) {
    throw new TypeError(`Theory System must be ${FIXED_THEORY_SYSTEM_ID}`)
  }
  const values = {
    approvedExtractions,
    evidenceReview,
    ledger,
    theoryCatalog,
    theoryRun,
    verticalSlice,
    theorySystem,
  }
  for (const [key, expected] of Object.entries(FIXED_SOURCE_DIGESTS)) {
    if (digestValue(values[key]) !== expected) {
      throw new TypeError(`${SOURCE_LABELS[key]} does not match the canonical fixed authority`)
    }
  }
  if (!exactJson(theoryRun?.theorySystem, theorySystem)) {
    throw new TypeError('Theory Agent run does not contain the canonical Theory System')
  }
  return structuredClone(FIXED_SOURCE_DIGESTS)
}

function prepareScenarioCompilation({
  approvedExtractions,
  evidenceReview,
  ledger,
  theoryCatalog,
  theoryRun,
  theorySystem,
  verticalSlice,
} = {}) {
  const ledgerValidation = validateEvidenceLedger(ledger)
  if (!ledgerValidation.valid) throw new TypeError(`Evidence ledger failed validation: ${ledgerValidation.errors.join('; ')}`)
  const sliceValidation = validateVerticalSlice(verticalSlice)
  if (!sliceValidation.valid) throw new TypeError(sliceValidation.errors.join('; '))
  if (theoryCatalog?.schemaVersion !== 'theory-catalog/1.0' || !Array.isArray(theoryCatalog.theories)) {
    throw new TypeError('A versioned theory catalog is required')
  }
  const theorySystemValidation = validateTheorySystem(theorySystem, { ledger, theoryCatalog })
  if (!theorySystemValidation.valid) {
    throw new TypeError(`Theory system failed validation: ${theorySystemValidation.errors.join('; ')}`)
  }

  const theoriesById = new Map(theoryCatalog.theories.map((theory) => [theory.id, theory]))
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]))
  const approvedTheoryIds = [...new Set(theorySystem.approvedMappings.map((mapping) => mapping.theoryId))]
  const selectedTheories = approvedTheoryIds.map((id) => {
    const theory = theoriesById.get(id)
    if (!theory) throw new TypeError(`Unknown theory in vertical slice: ${id}`)
    const sourceClaim = claimsById.get(theory.sourceClaimId)
    if (!sourceClaim || sourceClaim.claimType !== 'academic-construct' || sourceClaim.evidenceStatus !== 'verified') {
      throw new TypeError(`Theory ${id} does not resolve to a verified academic claim`)
    }
    return structuredClone(theory)
  })
  const evidencePack = buildEvidencePack(ledger, { claimIds: verticalSlice.evidenceClaimIds })
  const sliceClaimIds = new Set(verticalSlice.theoryClaimIds || verticalSlice.evidenceClaimIds)
  const mappedClaimIds = new Set(theorySystem.approvedMappings.flatMap((mapping) => mapping.claimIds))
  if ([...sliceClaimIds].some((claimId) => !mappedClaimIds.has(claimId))) {
    throw new TypeError('Approved theory system does not map every vertical slice evidence claim')
  }
  if ([...mappedClaimIds].some((claimId) => !sliceClaimIds.has(claimId))) {
    throw new TypeError('Approved theory system contains claims outside the vertical slice')
  }

  const prepared = {
    verticalSliceId: verticalSlice.id,
    theorySystemId: theorySystem.id,
    brief: verticalSlice.brief,
    targetLanguages: [...verticalSlice.scope.targetLanguages],
    evidencePack,
    theoryCatalog: {
      schemaVersion: theoryCatalog.schemaVersion,
      theories: selectedTheories,
    },
    approvedTheoryMappings: structuredClone(theorySystem.approvedMappings),
    boundaries: [...verticalSlice.boundaries],
  }
  if (verticalSlice.id === FIXED_VERTICAL_SLICE_ID || theorySystem.id === FIXED_THEORY_SYSTEM_ID) {
    prepared.sourceDigests = assertFixedAuthority({
      approvedExtractions,
      evidenceReview,
      ledger,
      theoryCatalog,
      theoryRun,
      theorySystem,
      verticalSlice,
    })
    prepared.evidenceLanguageBoundary = deriveEvidenceLanguageBoundary(evidencePack)
  }
  return prepared
}

function validateFixedCompilationArtifact(compiled, inputs = {}) {
  const errors = []
  let prepared
  try {
    prepared = prepareScenarioCompilation(inputs)
  } catch (error) {
    return { valid: false, errors: [error.message] }
  }
  if (!prepared.sourceDigests || !prepared.evidenceLanguageBoundary) {
    return { valid: false, errors: ['Fixed compilation requires the canonical vertical slice and Theory System'] }
  }
  const base = validateCompiledScenario(compiled, {
    evidencePack: prepared.evidencePack,
    theoryCatalog: prepared.theoryCatalog,
    approvedTheoryMappings: prepared.approvedTheoryMappings,
    theorySystemId: prepared.theorySystemId,
  })
  errors.push(...base.errors)
  if (compiled?.id !== FIXED_VERTICAL_SLICE_ID || compiled?.scenario?.id !== FIXED_VERTICAL_SLICE_ID) {
    errors.push('Fixed compilation scenario identity does not match the canonical vertical slice')
  }
  if (compiled?.theorySystemId !== FIXED_THEORY_SYSTEM_ID) {
    errors.push('Fixed compilation Theory System identity does not match the canonical authority')
  }
  if (!exactJson(compiled?.sourceDigests, prepared.sourceDigests)) {
    errors.push('Fixed compilation source digests do not match canonical source values')
  }
  if (!exactJson(compiled?.evidenceLanguageBoundary, prepared.evidenceLanguageBoundary)) {
    errors.push('Fixed compilation evidence language boundary does not match direct source verification')
  }
  if (!exactJson(compiled?.validation, {
    schemaVersion: 'fixed-compilation-validation/1.0',
    status: 'passed',
  })) {
    errors.push('Fixed compilation validation marker is not canonical')
  }
  if (!exactJson(compiled?.verticalSlice, {
    id: prepared.verticalSliceId,
    theorySystemId: prepared.theorySystemId,
    targetLanguages: prepared.targetLanguages,
    boundaries: prepared.boundaries,
  })) {
    errors.push('Fixed compilation vertical slice binding does not match canonical inputs')
  }
  if (!exactJson(compiled?.citations, prepared.evidencePack.claims.map((claim) => claim.id))) {
    errors.push('Fixed compilation citations must exhaustively match the approved fixed evidence claims')
  }
  const expectedMappings = prepared.approvedTheoryMappings.map((mapping) => ({
    theoryId: mapping.theoryId,
    claimIds: [...mapping.claimIds],
    mechanism: mapping.mechanism,
    parameterPaths: [...mapping.parameterPaths],
  }))
  if (!exactJson(compiled?.theoryMappings, expectedMappings)) {
    errors.push('Fixed compilation theory mappings must exactly match the approved Theory System')
  }
  const requiredPaths = requiredNumericBindingPaths(compiled)
  const actualPaths = (compiled?.parameterBindings || []).map((binding) => binding.path)
  if (!exactJson([...actualPaths].sort(), [...requiredPaths].sort())) {
    errors.push('Fixed compilation parameter binding paths must exactly cover supported numeric values')
  }
  const boundAssumptionIds = new Set(
    (compiled?.parameterBindings || [])
      .filter((binding) => binding.basis === 'synthetic-assumption')
      .map((binding) => binding.assumptionId),
  )
  if (
    !Array.isArray(compiled?.assumptions) ||
    compiled.assumptions.length !== boundAssumptionIds.size ||
    compiled.assumptions.some((assumption) => !boundAssumptionIds.has(assumption.id))
  ) {
    errors.push('Fixed compilation assumptions must be exhaustively bound to supported parameter paths')
  }
  if (Object.values(compiled?.scenario?.regionFactors || {}).some((factor) => factor !== 1)) {
    errors.push('Fixed compilation regional factors must remain exactly 1.0')
  }
  if (!prepared.boundaries.every((boundary) => compiled?.limitations?.includes(boundary))) {
    errors.push('Fixed compilation limitations must preserve every canonical fact and counterfactual boundary')
  }
  const provenance = compiled?.provenance
  const capabilities = compiled?.capabilities
  if (provenance?.mode === 'live-model') {
    if (
      provenance.provider !== 'minimax' ||
      provenance.model !== 'MiniMax-M2.7' ||
      provenance.schemaName !== 'compiled-scenario/1.0' ||
      !isNonEmptyString(provenance.requestId) ||
      capabilities?.realModelUsed !== true ||
      capabilities?.recordedModelOutput !== false
    ) errors.push('Fixed compilation live provenance is not attributable to the approved MiniMax request')
  } else if (provenance?.mode === 'recorded-model-output') {
    if (
      provenance.provider !== 'replay' ||
      !isNonEmptyString(provenance.recordingId) ||
      provenance.requestId !== null ||
      capabilities?.realModelUsed !== false ||
      capabilities?.recordedModelOutput !== true
    ) errors.push('Fixed compilation recorded provenance is not truthful')
  } else {
    errors.push('Fixed compilation provenance mode is unsupported')
  }
  if (capabilities?.evidenceBounded !== true || capabilities?.humanApprovedTheorySystem !== true) {
    errors.push('Fixed compilation capabilities do not preserve evidence and Theory System authority')
  }
  return { valid: errors.length === 0, errors }
}

async function runScenarioCompilation({ provider, ...inputs } = {}) {
  const prepared = prepareScenarioCompilation(inputs)
  if (!prepared.sourceDigests || !prepared.evidenceLanguageBoundary) {
    throw new TypeError('Scenario generation is restricted to the canonical fixed vertical slice')
  }
  let compiled
  try {
    compiled = await compileScenario({
      provider,
      evidencePack: prepared.evidencePack,
      theoryCatalog: prepared.theoryCatalog,
      approvedTheoryMappings: prepared.approvedTheoryMappings,
      theorySystemId: prepared.theorySystemId,
      brief: prepared.brief,
    })
  } catch {
    throw new TypeError('Scenario compilation failed local validation')
  }
  const result = {
    ...compiled,
    sourceDigests: structuredClone(prepared.sourceDigests),
    evidenceLanguageBoundary: structuredClone(prepared.evidenceLanguageBoundary),
    validation: {
      schemaVersion: 'fixed-compilation-validation/1.0',
      status: 'passed',
    },
    verticalSlice: {
      id: prepared.verticalSliceId,
      theorySystemId: prepared.theorySystemId,
      targetLanguages: prepared.targetLanguages,
      boundaries: prepared.boundaries,
    },
  }
  const validation = validateFixedCompilationArtifact(result, inputs)
  if (!validation.valid) throw new TypeError('Scenario compilation failed fixed authority validation')
  return result
}

module.exports = {
  REQUIRED_TARGET_LANGUAGES,
  FIXED_SOURCE_DIGESTS,
  FIXED_THEORY_SYSTEM_ID,
  FIXED_VERTICAL_SLICE_ID,
  prepareScenarioCompilation,
  runScenarioCompilation,
  validateFixedCompilationArtifact,
  validateVerticalSlice,
}
