const core = require('@actions/core');
const github = require('@actions/github');
const { toIngestData, sendIngest } = require('./ingest')
const { finalizeCheck } = require('./check')
const { runSpectralScan, installSpectral } = require('./agent')

const getSpectralSaasHost = (dsn) => {
  return (new URL(dsn)).host
}

core.exportVariable('SPECTRAL_DSN', spectralDsn);

const workspace = process.env.GITHUB_WORKSPACE;
const spectralDsn = core.getInput('spectral-dsn')
const binDir = `${workspace}/bin`;
const branchName = github.context.ref?.substring('refs/heads/'.length)
const assetUri = github.context.payload.repository.html_url
const fullRepoName = github.context.payload.repository.full_name
const [_, repo] = fullRepoName.split('/')
const spectralSaasHost = getSpectralSaasHost(
    process.env.SPECTRAL_DSN
)

async function main() {
  await installSpectral(binDir)
  
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
    const ingestResponseText = await res.text()
    console.debug('got response from ingest: ', ingestResponseText)

    const ingestResponseBody = JSON.parse(resText)
    finalizeCheck(ingestResponseBody.assetChanges.issuesOnlyInThisVariant)
  } else {
    const resBody = await res.json()
    throw new Error(
      `ingest request failed with code ${res.status
      }. Result: ${JSON.stringify(resBody)}`
    )
  }
}

main().catch(error => {
    core.setFailed(error)
})