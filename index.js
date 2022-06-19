const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require("node-fetch");

function parseIssues(issues) {
  return issues.map(issue => {

    return {
      id: issue.number,
      title: issue.title,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      labels: issue.labels,
    }

  })
}

function selectIssues(issues, expectedNum) {
  const getNumber = expectedNum > issues.length ? issues.length : expectedNum
  const allIds = issues.map( issue => issue.id).sort( () => Math.random())
  const selectedIds = allIds.slice(0, getNumber)

  return issues.filter( 
    issue => selectedIds.includes(issue.id)
  )
}

function transformIssues(issues) {
  return issues.map(issue => {
    const labels = issue.labels.length > 0 
      ? `Tag: #${issue.labels.join(' #')}`
      : ''

    return {
      msg: `${issue.title}\n\n${labels}`,
      issueId: issue.id
    }
  })
}

async function main() {
  try {

    // INPUT
    const token = core.getInput('token', { required: true });
    const functionsEndpoint = core.getInput('functions_endpoint', { required: true });
    const hostKey = core.getInput('host_key', { required: true });

    // INIT
    const octokit = new github.getOctokit(token);
    const { owner, repo } = github.context.repo
    const sendTelegramEndpoint = `${functionsEndpoint}/api/sendTelegram?code=${hostKey}&clientId=default`
    const response = await octokit.rest.issues.listForRepo({
      owner: owner,
      repo: repo,
      state: 'open',
      per_page: 100,
      sort: 'created',
      direction: 'desc'
    })

    // PROCESS
    const issues = parseIssues(response.data)
    const selectedIssues = selectIssues(issues, 2) // TODO no hard code
    const transformedIssue = transformIssues(selectedIssues)

    const sendIssuesOptions = {
      method: "POST",
      body: JSON.stringify(transformedIssue),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    };

    // OUTPUT
    const responseSendTelegram = await fetch(sendTelegramEndpoint, sendIssuesOptions)
    console.log({issues})
    console.log({selectedIssues})
    console.log({transformedIssue})

    core.setOutput('issues', JSON.stringify(issues, null, 4))
    core.setOutput('transformedIssues', JSON.stringify(transformedIssue, null, 4))

  } catch (error) {
    core.setFailed(error.message);
  }
}

main()