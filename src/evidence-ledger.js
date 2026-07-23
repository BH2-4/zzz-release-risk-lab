'use strict'

const LEDGER_SCHEMA_VERSION = 'evidence-ledger/1.0'
const PACK_SCHEMA_VERSION = 'evidence-pack/1.0'
const SOURCE_GRADES = new Set(['A', 'B', 'C', 'F'])
const SOURCE_KINDS = new Set([
  'official',
  'academic',
  'professional-media',
  'community',
  'search-index',
])
const VERIFICATION_STATUSES = new Set(['direct', 'metadata', 'candidate', 'unavailable'])
const CLAIM_TYPES = new Set([
  'fact',
  'reported-fact',
  'academic-construct',
  'interpretation',
  'synthetic-assumption',
])
const EVIDENCE_STATUSES = new Set(['verified', 'reported', 'candidate', 'synthetic'])

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function fingerprint(value) {
  if (typeof module === 'undefined' || !module.exports) {
    throw new Error('Evidence pack hashing is available only at the server-side compilation boundary')
  }
  const { createHash } = require('node:crypto')
  return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isLanguageTag(value) {
  return isNonEmptyString(value) && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value)
}

function isDateLike(value) {
  return isNonEmptyString(value) && /^\d{4}-\d{2}(?:-\d{2})?(?:T[^\s]+)?$/.test(value)
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateSource(source, index, errors) {
  const label = `Source ${source?.id || index}`
  if (!source || typeof source !== 'object') {
    errors.push(`${label} must be an object`)
    return
  }
  for (const field of ['id', 'title', 'publisher']) {
    if (!isNonEmptyString(source[field])) errors.push(`${label} requires ${field}`)
  }
  if (!SOURCE_KINDS.has(source.kind)) errors.push(`${label} has unsupported kind`)
  if (!SOURCE_GRADES.has(source.grade)) errors.push(`${label} has unsupported grade`)
  if (!isHttpUrl(source.url)) errors.push(`${label} requires an absolute HTTP(S) URL`)
  if (!isDateLike(source.publishedAt)) errors.push(`${label} requires publishedAt`)
  if (!isDateLike(source.accessedAt)) errors.push(`${label} requires accessedAt`)
  if (!isLanguageTag(source.language)) errors.push(`${label} requires a BCP-47 language tag`)
  if (!source.verification || !VERIFICATION_STATUSES.has(source.verification.status)) {
    errors.push(`${label} requires a verification status`)
  } else {
    if (!isNonEmptyString(source.verification.method)) errors.push(`${label} requires a verification method`)
    if (!isDateLike(source.verification.checkedAt)) errors.push(`${label} requires verification.checkedAt`)
    if (['A', 'B'].includes(source.grade) && !['direct', 'metadata'].includes(source.verification.status)) {
      errors.push(`${label} grade ${source.grade} must be directly or metadata verified`)
    }
  }
}

function validateClaim(claim, index, sourcesById, errors) {
  const label = `Claim ${claim?.id || index}`
  if (!claim || typeof claim !== 'object') {
    errors.push(`${label} must be an object`)
    return
  }
  if (!isNonEmptyString(claim.id)) errors.push(`${label} requires id`)
  if (!CLAIM_TYPES.has(claim.claimType)) errors.push(`${label} has unsupported claimType`)
  if (!EVIDENCE_STATUSES.has(claim.evidenceStatus)) errors.push(`${label} has unsupported evidenceStatus`)
  if (!isNonEmptyString(claim.text)) errors.push(`${label} requires text`)
  if (!isLanguageTag(claim.language)) errors.push(`${label} requires a BCP-47 language tag`)
  if (!Array.isArray(claim.allowedUses) || claim.allowedUses.length === 0 || claim.allowedUses.some((item) => !isNonEmptyString(item))) {
    errors.push(`${label} requires allowedUses`)
  }

  const refs = Array.isArray(claim.sourceRefs) ? claim.sourceRefs : []
  if (claim.claimType === 'synthetic-assumption' || claim.evidenceStatus === 'synthetic') {
    if (claim.claimType !== 'synthetic-assumption' || claim.evidenceStatus !== 'synthetic') {
      errors.push(`${label} must consistently declare a synthetic assumption`)
    }
    if (refs.length > 0) errors.push(`${label} synthetic assumption must not have source references`)
    if (!isNonEmptyString(claim.rationale)) errors.push(`${label} synthetic assumption requires rationale`)
    return
  }

  if (refs.length === 0) errors.push(`${label} requires at least one source reference`)
  const sources = []
  for (const ref of refs) {
    const source = sourcesById.get(ref?.sourceId)
    if (!source) {
      errors.push(`${label} references unknown source ${ref?.sourceId || ''}`.trim())
      continue
    }
    sources.push(source)
    if (!isNonEmptyString(ref.locator)) errors.push(`${label} source reference requires a locator`)
  }

  if (claim.evidenceStatus === 'verified') {
    if (sources.some((source) => source.grade !== 'A' || !['direct', 'metadata'].includes(source.verification.status))) {
      errors.push(`${label} verified claim requires grade A direct or metadata sources`)
    }
  }
  if (claim.evidenceStatus === 'reported') {
    if (sources.some((source) => !['A', 'B'].includes(source.grade) || !['direct', 'metadata'].includes(source.verification.status))) {
      errors.push(`${label} reported claim requires verified grade A or B sources`)
    }
  }
}

function validateEvidenceLedger(ledger) {
  const errors = []
  if (!ledger || typeof ledger !== 'object') return { valid: false, errors: ['Evidence ledger is required'] }
  if (ledger.schemaVersion !== LEDGER_SCHEMA_VERSION) errors.push(`Unsupported evidence ledger schema: ${ledger.schemaVersion}`)
  if (!isNonEmptyString(ledger.ledgerId)) errors.push('Evidence ledger requires ledgerId')
  if (!isDateLike(ledger.updatedAt)) errors.push('Evidence ledger requires updatedAt')
  if (!Array.isArray(ledger.sources) || ledger.sources.length === 0) errors.push('Evidence ledger requires sources')
  if (!Array.isArray(ledger.claims) || ledger.claims.length === 0) errors.push('Evidence ledger requires claims')

  const sources = Array.isArray(ledger.sources) ? ledger.sources : []
  const claims = Array.isArray(ledger.claims) ? ledger.claims : []
  const sourceIds = new Set()
  for (const [index, source] of sources.entries()) {
    validateSource(source, index, errors)
    if (sourceIds.has(source?.id)) errors.push(`Duplicate source id: ${source.id}`)
    sourceIds.add(source?.id)
  }
  const sourcesById = new Map(sources.map((source) => [source.id, source]))
  const claimIds = new Set()
  for (const [index, claim] of claims.entries()) {
    validateClaim(claim, index, sourcesById, errors)
    if (claimIds.has(claim?.id)) errors.push(`Duplicate claim id: ${claim.id}`)
    claimIds.add(claim?.id)
  }
  return { valid: errors.length === 0, errors }
}

function assertEvidenceLedger(ledger) {
  const validation = validateEvidenceLedger(ledger)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
}

function projectClaim(claim) {
  const projected = {
    id: claim.id,
    claimType: claim.claimType,
    evidenceStatus: claim.evidenceStatus,
    text: claim.text,
    language: claim.language,
    sourceRefs: (claim.sourceRefs || []).map((ref) => ({
      sourceId: ref.sourceId,
      locator: ref.locator,
    })),
    allowedUses: [...claim.allowedUses],
  }
  if (claim.claimType === 'synthetic-assumption') projected.rationale = claim.rationale
  return projected
}

function projectSource(source) {
  return {
    id: source.id,
    kind: source.kind,
    grade: source.grade,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    publishedAt: source.publishedAt,
    accessedAt: source.accessedAt,
    language: source.language,
    verification: {
      status: source.verification.status,
      method: source.verification.method,
      checkedAt: source.verification.checkedAt,
    },
  }
}

function buildEvidencePack(ledger, { claimIds, allowCandidate = false } = {}) {
  assertEvidenceLedger(ledger)
  if (!Array.isArray(claimIds) || claimIds.length === 0) {
    throw new TypeError('Evidence pack requires at least one claim id')
  }
  const claimsById = new Map(ledger.claims.map((claim) => [claim.id, claim]))
  const selectedClaims = claimIds.map((id) => {
    const claim = claimsById.get(id)
    if (!claim) throw new TypeError(`Unknown evidence claim: ${id}`)
    if (claim.evidenceStatus === 'candidate' && !allowCandidate) {
      throw new TypeError(`Candidate evidence is excluded from default packs: ${id}`)
    }
    return projectClaim(claim)
  })
  const sourceIds = new Set(selectedClaims.flatMap((claim) => claim.sourceRefs.map((ref) => ref.sourceId)))
  const selectedSources = ledger.sources
    .filter((source) => sourceIds.has(source.id))
    .map(projectSource)
  const languages = [...new Set(selectedClaims.map((claim) => claim.language))].sort()
  const provenance = {
    ledgerSchemaVersion: ledger.schemaVersion,
    ledgerUpdatedAt: ledger.updatedAt,
    candidateClaimsIncluded: selectedClaims.some((claim) => claim.evidenceStatus === 'candidate'),
  }
  const packContent = {
    schemaVersion: PACK_SCHEMA_VERSION,
    ledgerId: ledger.ledgerId,
    languages,
    claims: selectedClaims,
    sources: selectedSources,
    provenance,
  }
  const contentFingerprint = fingerprint(packContent)
  return {
    ...packContent,
    packId: `evidence-pack:${contentFingerprint}`,
    provenance: {
      ...provenance,
      fingerprint: contentFingerprint,
    },
  }
}

const evidenceLedgerApi = {
  LEDGER_SCHEMA_VERSION,
  PACK_SCHEMA_VERSION,
  assertEvidenceLedger,
  buildEvidencePack,
  canonicalJson,
  validateEvidenceLedger,
}

if (typeof module !== 'undefined' && module.exports) module.exports = evidenceLedgerApi
if (typeof globalThis !== 'undefined') globalThis.ZZZEvidenceLedger = evidenceLedgerApi
