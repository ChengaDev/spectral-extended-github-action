const github = require('@actions/github');
const exec = require("@actions/exec").exec;
const io = require('@actions/io');
const tc = require('@actions/tool-cache');
const fs = require('fs')

const spectralOutputFilePath = `scan_${github.context.sha}.out`

async function downloadTool(platform, spectralDsn) {
    const url = `${spectralDsn}/latest/dl/${platform}`
    return await tc.downloadTool(url);
}

async function installZip(path, platform, spectralDsn) {
  await io.mkdirP(path);
  const downloadPath = await downloadTool(platform, spectralDsn)
  await tc.extractTar(downloadPath, path)
}

async function installExecutable(path, spectralDsn) {
  await io.mkdirP(path);
  const downloadPath = await downloadTool('exe', spectralDsn)
  await io.mv(downloadPath, `${path}/spectral.exe`)
}

const pathExist = (filePath) => {
  try {
    return fs.existsSync(filePath)
  } catch (err) {
    return false
  }
}

async function runSpectralScan() {
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
  
  console.debug('Spectral scan results', JSON.stringify(scanResults, null, 2))
  return JSON.parse(fs.readFileSync(spectralOutputFilePath, 'utf8'))
}

async function installSpectral(binDir, spectralDsn) {
    switch (process.platform) {
  case 'win32':
      await installExecutable(binDir, spectralDsn)
      break;
  case 'linux':
      await installZip(binDir, process.platform, spectralDsn)
      break;
  case 'darwin':
      await installZip(binDir, 'mac', spectralDsn)
      break;
  default:
      throw new Error(`Platform: ${process.platform} is not supported`);
  }  

  await core.addPath(binDir)
}

function getScanCommand() {
  const spectralArgs = core.getInput('spectral-args')
  return `${process.platform === 'win32' ?
      'spectral.exe' : 'spectral'
      } ${spectralArgs} --asset-kind git --unpack --internal-output ${spectralOutputFilePath} --nosend`
}

module.exports = {
  installSpectral,
  runSpectralScan   
}