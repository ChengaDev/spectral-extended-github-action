const mapIssuesToNewSeverity = (issues) => {
  issues.forEach((issue) => {
    issue.severity = mapToNewSeverity(issue.severity)
    issue.displaySeverity = mapToNewSeverity(issue.displaySeverity || issue.severity)
  })
  return issues
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'informational']
const getSortedIssues = (issues) => {
  return issues.sort((a, b) => {
    return (
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    )
  })
}

export const timeout = (promise, time) => {
  let timer
  return Promise.race([
    promise,
    new Promise(
      (_r, rej) =>
        (timer = setTimeout(rej, time, new Error('function timed out')))
    ),
  ]).finally(() => clearTimeout(timer))
}

const getCheckConclusion = (
  checkPolicy = 1,
  critical,
  high,
  medium,
  low,
  informational
) => {
  switch (checkPolicy) {
    case 'Fail on any issue':
      if (critical + high + medium + low + informational > 0) {
        return 'failure'
      }
      break
    case 'Fail on low and above':
      if (critical + high + medium + low > 0) {
        return 'failure'
      }
      if (informational > 0) {
        return 'neutral'
      }
      break
    case 'Fail on medium and above':
      if (critical + high + medium > 0) {
        return 'failure'
      }
      if (informational + low > 0) {
        return 'neutral'
      }
      break
    case 'Fail on high and above':
      if (critical + high > 0) {
        return 'failure'
      }
      if (informational + low + medium > 0) {
        return 'neutral'
      }
      break
    case 'Fail on critical only':
      if (critical > 0) {
        return 'failure'
      }
      if (informational + low + medium + high > 0) {
        return 'neutral'
      }
      break
    case 'Always pass':
      return 'success'
    default:
      console.error(
        'CheckPolicy is not valid, must be one of "Fail on any issue" / "Fail on low and above" / "Fail on medium and above" / "Fail on high and above" / "Fail on critical only" / "Always pass"'
      )
      return 'neutral'
  }
  return 'success'
}

async function finalizeCheck(
  checkIssues
) {
  const issues = mapIssuesToNewSeverity(checkIssues)
  const critical = issues.filter(
    ({ displaySeverity }) => displaySeverity === 'critical'
  )
  const high = issues.filter(
    ({ displaySeverity }) => displaySeverity === 'high'
  )
  const medium = issues.filter(
    ({ displaySeverity }) => displaySeverity === 'medium'
  )
  const low = issues.filter(({ displaySeverity }) => displaySeverity === 'low')
  const informational = issues.filter(
    ({ displaySeverity }) => displaySeverity === 'informational'
  )

  const sortedIssues = getSortedIssues(issues)
  const issuesCount = sortedIssues.length
  console.info(
    `found ${issuesCount} issues (critical=${critical.length}, high=${high.length}, medium=${medium.length}), low=${low.length}, informational=${informational.length}), check policy is: `,
    process.env.CHECK_POLICY
  )

  if (issuesCount.length > 0) {
    console.log('Table of issues...')
    process.exit(1)
  }
  
  process.exit(0)
}

module.exports = {
  mapIssuesToNewSeverity,
  finalizeCheck,
  getCheckConclusion
}