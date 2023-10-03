const toIngestData = ({
  assetId, assetUri, branch, assetName, ref, isPR
}, {
  items,
  run_context,
  stats: {
    total_files_read,
    total_bytes_read,
    duration: { nanos }
  }
}, source, scanIdentifier) => ({
  asset: {
    id: assetId,
    uri: assetUri,
    ref,
    name: assetName,
    variant: branch,
    source,
    kind: 'git',
  },
  time: new Date().toISOString(),
  issues: items.map((item) => {
    const relativePath = item.finding
    return {
      relativePath,
      absolutePath: `${assetUri}${relativePath}`,
      position: item.position,
      line_start: item.position?.start[0] || 1,
      fingerprint: item.fingerprint,
      rule: item.rule,
      metadata: {
        ...item.metadata,
        [scanIdentifier]: true
      },
    }
  }),
  stats: {
    totalFilesRead: total_files_read,
    totalBytesRead: total_bytes_read,
    durationMillis: Math.floor(nanos / 1000000),
  },
  metadata: {
    scanner: { name: 'spectral', version: '-' },
    scanContext: run_context,
    context: {
      isPR,
      [scanIdentifier]: true
    }
  }
})

async function sendIngest(adaptedIngestData, spectralSaasHost, spectralDsn) {
  console.debug('ingest to be sent', adaptedIngestData)
  
  const spectralIngestUrl = `https://${spectralSaasHost}/api/v1/ingest?dsn=${spectralDsn}`
  const res = await fetch(spectralIngestUrl, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(adaptedIngestData),
  })
  return res
}

module.exports = { toIngestData, sendIngest }