'use strict'

const { buildEvidencePack, validateEvidenceLedger } = require('./evidence-ledger.js')
const { compileScenario } = require('./scenario-compiler.js')
const { validateTheorySystem } = require('./theory-system.js')

const REQUIRED_TARGET_LANGUAGES = Object.freeze(['zh-CN', 'en', 'ja'])

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

function prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice } = {}) {
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

  return {
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
}

async function runScenarioCompilation({ provider, ledger, theoryCatalog, theorySystem, verticalSlice } = {}) {
  const prepared = prepareScenarioCompilation({ ledger, theoryCatalog, theorySystem, verticalSlice })
  const compiled = await compileScenario({
    provider,
    evidencePack: prepared.evidencePack,
    theoryCatalog: prepared.theoryCatalog,
    approvedTheoryMappings: prepared.approvedTheoryMappings,
    theorySystemId: prepared.theorySystemId,
    brief: prepared.brief,
  })
  return {
    ...compiled,
    verticalSlice: {
      id: prepared.verticalSliceId,
      theorySystemId: prepared.theorySystemId,
      targetLanguages: prepared.targetLanguages,
      boundaries: prepared.boundaries,
    },
  }
}

module.exports = {
  REQUIRED_TARGET_LANGUAGES,
  prepareScenarioCompilation,
  runScenarioCompilation,
  validateVerticalSlice,
}
