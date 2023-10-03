const fs = require('fs')
const core = require('@actions/core');
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const exec = require("@actions/exec").exec;
const github = require('@actions/github');
const { toIngestData } = require('./ingest')
const fetch = require('node-fetch')

const workspace = process.env.GITHUB_WORKSPACE;
const spectralDsn = core.getInput('spectral-dsn')
const binDir = `${workspace}/bin`;
const spectralOutputFilePath = `scan_${github.context.sha}.out`

const getSpectralSaasHost = (dsn) => {
  return (new URL(dsn)).host
}

// Provide SPECTRAL_DSN to spectral binary through env
core.exportVariable('SPECTRAL_DSN', spectralDsn);

main().catch(error => {
    core.setFailed(error)
})

async function main() {
    switch (process.platform) {
        case 'win32':
            await installExecutable(binDir)
            break;
        case 'linux':
            await installZip(binDir, process.platform)
            break;
        case 'darwin':
            await installZip(binDir, 'mac')
            break;
        default:
            throw new Error(`Platform: ${process.platform} is not supported`);
    }  

    await core.addPath(binDir)
    await runSpectral()
}

async function downloadTool(platform) {
    const url = `${spectralDsn}/latest/dl/${platform}`
    return await tc.downloadTool(url);
}

async function installZip(path, platform) {
    await io.mkdirP(path);
    const downloadPath = await downloadTool(platform)
    await tc.extractTar(downloadPath, path)
}

async function installExecutable(path) {
    await io.mkdirP(path);
    const downloadPath = await downloadTool('exe')
    await io.mv(downloadPath, `${path}/spectral.exe`)
}

const pathExist = (filePath) => {
  try {
    return fs.existsSync(filePath)
  } catch (err) {
    return false
  }
}

async function runSpectral() {
    const scanCommand = getScanCommand()
    const result = await exec(scanCommand)

    if (result.error) {
        console.error('Spectral exit with error:', result.error)
    }

    if (result.stderr) {
        const errorLogs = result.stderr.toString()
        console.error('Spectral error logs', errorLogs)
    }

    if (result.stdout) {
        const runLogs = result.stdout.toString()
        console.log('Spectral run logs', runLogs.toString())
    }

    if (!pathExist(spectralOutputFilePath)) {
    console.error(
      `Spectral output file ${spectralOutputFilePath} was not created. stopping execution.`
    )
    process.exit(1)
  }

  const scanResults = JSON.parse(fs.readFileSync(spectralOutputFilePath, 'utf8'))
    console.debug('Spectral scan results', JSON.stringify(scanResults, null, 2))

    const branchName = github.context.ref?.substring('refs/heads/'.length)
    const assetUri = github.context.payload.repository.html_url
    const fullRepoName = github.context.payload.repository.full_name
    const [_, repo] = fullRepoName.split('/')

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

    console.debug('ingest to be sent', adaptedIngestData)

    const spectralSaasHost = getSpectralSaasHost(
        process.env.SPECTRAL_DSN
    )

    const spectralIngestUrl = `https://${spectralSaasHost}/api/v1/ingest?dsn=${process.env.SPECTRAL_DSN}`
    const res = await fetch(spectralIngestUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(adaptedIngestData),
    })
}

function getScanCommand() {
    const spectralArgs = core.getInput('spectral-args')
    return `${process.platform === 'win32' ?
        'spectral.exe' : 'spectral'
        } ${spectralArgs} --asset-kind git --unpack --internal-output ${spectralOutputFilePath} --nosend`
}
