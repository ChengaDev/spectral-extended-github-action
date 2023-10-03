const core = require('@actions/core');
const github = require('@actions/github');
const { toIngestData, sendIngest } = require('./ingest')
const { finalizeCheck } = require('./check')
const { runSpectralScan, installSpectral } = require('./agent')

const getSpectralSaasHost = (dsn) => {
  return (new URL(dsn)).host
}

const workspace = process.env.GITHUB_WORKSPACE;
const spectralDsn = core.getInput('spectral-dsn')
const binDir = `${workspace}/bin`;
const branchName = github.context.ref?.substring('refs/heads/'.length)
const assetUri = github.context.payload.repository.html_url
const fullRepoName = github.context.payload.repository.full_name
const [_, repo] = fullRepoName.split('/')
const spectralSaasHost = getSpectralSaasHost(spectralDsn)

core.exportVariable('SPECTRAL_DSN', spectralDsn);

async function main() {
  await installSpectral(binDir, spectralDsn)
  
  const scanResults = await runSpectralScan()
  const adaptedIngestData = toIngestData(
    {
      assetId: `git://github.com/${fullRepoName}`,
      assetUri,
      branch: branchName,
      assetName: repo,
      ref: github.context.sha,
      isPR: false,
    },
    scanResults,
    'github.com',
    'isGithubAppProbotScan'
  )

  const ingestResponse = await sendIngest(adaptedIngestData, spectralSaasHost, process.env.SPECTRAL_DSN)

  if (ingestResponse.status === 200) { 
    const ingestResponseText = await ingestResponse.text()
    console.debug('got response from ingest: ', ingestResponseText)

    const ingestResponseBody = JSON.parse(ingestResponseText)
    finalizeCheck(ingestResponseBody.assetChanges.issuesOnlyInThisVariant)
  } else {
    const ingestResponseBody = await ingestResponse.json()
    throw new Error(
      `ingest request failed with code ${ingestResponse.status
      }. Result: ${JSON.stringify(ingestResponseBody)}`
    )
  }
}

main().catch(error => {
    core.setFailed(error)
})