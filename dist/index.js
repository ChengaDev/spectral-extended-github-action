/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 99:
/***/ ((__unused_webpack_module, __webpack_exports__, __nccwpck_require__) => {

"use strict";
__nccwpck_require__.r(__webpack_exports__);
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   "toIngestData": () => (/* binding */ toIngestData)
/* harmony export */ });
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

/***/ }),

/***/ 105:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 946:
/***/ ((module) => {

module.exports = eval("require")("@actions/exec");


/***/ }),

/***/ 82:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 220:
/***/ ((module) => {

module.exports = eval("require")("@actions/io");


/***/ }),

/***/ 779:
/***/ ((module) => {

module.exports = eval("require")("@actions/tool-cache");


/***/ }),

/***/ 585:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 147:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nccwpck_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nccwpck_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
__nccwpck_require__.r(__webpack_exports__);
/* harmony export */ __nccwpck_require__.d(__webpack_exports__, {
/* harmony export */   "getSpectralSaasHost": () => (/* binding */ getSpectralSaasHost),
/* harmony export */   "pathExist": () => (/* binding */ pathExist)
/* harmony export */ });
const fs = __nccwpck_require__(147)
const core = __nccwpck_require__(105);
const io = __nccwpck_require__(220);
const tc = __nccwpck_require__(779);
const exec = (__nccwpck_require__(946).exec);
const github = __nccwpck_require__(82);
const { toIngestData } = __nccwpck_require__(99)
const fetch = __nccwpck_require__(585)

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

})();

module.exports = __webpack_exports__;
/******/ })()
;