const { promisify } = require('util');
const fs = require('fs');
const camelCase = require('camelcase');

const readFile = promisify(fs.readFile);


const REQUIRES_REPO = [
  'Create an issue',
  'Create a label',
  'Edit', // Edit repo name and other settings
  'Create a milestone',
  'Create a repository project',
  'Request a page build',
  // 'Create a pull request', // temporarily disabled because this won't work for now
  'Create a deployment',
  'Create a deployment status',
  'Create a file',
  'Create a release',
  'Create a fork',
  'Replace all topics for a repository',
  // 'Perform a merge', // temporarily disabled because this won't work for now
];

const REQUIRES_ISSUE = [
  'Edit an issue',
  'Lock an issue',
  'Add assignees to an issue',
  'Create a comment',
  // 'Add labels to an issue', // currently not working due to octokit/routes bug: https://github.com/octokit/routes/issues/205
];

const REQUIRES_PULL = [
  'Create a pull request review',
  'Submit a pull request review',
  'Merge a pull request (Merge Button)',
  'Update a pull request',
  'Create a review request',
];

const REQUIRES_COMMENT = [
  'Edit a comment',
];

const REQUIRES_PROJECT = [
  'Update a project',
  'Create a project column',
  'Create a project card', // requires column
];

const REQUIRES_COMMIT = [
  'Create a status',
  'Create a commit comment',
];

const REQUIRES_OTHER = [
  'Update a file',
  'Update a label',
  'Replace all labels for an issue',
  'Update a milestone',
  'Update a project card',
  'Move a project card',
  'Update a project column',
  'Move a project column',
  'Dismiss a pull request review',
  'Update a commit comment',
];

const PREVIEW_HEADERS = [
  'application/vnd.github.mercy-preview+json',
  'application/vnd.github.scarlet-witch-preview+json',
  'application/vnd.github.inertia-preview+json',
];

async function createGraphQLQuery(actions) {
  // Look up all the different queries by action name camelcase and concatenate them all together
  const potentialQueries = await Promise.all(actions.map(async (action) => {
    try {
      const content = await readFile(`lib/graphql/${action.name.toLowerCase().split(' ').join('-')}.graphql`, 'utf8');
      return content;
    } catch (err) {
      if (err.message.startsWith('ENOENT')) {
        return Promise.resolve();
      }
      throw err;
    }
  }));
  console.log(potentialQueries);
  const queries = potentialQueries.filter(query => query);
  if (queries.length === 0) {
    return null;
  }
  return `query GetSomeData($owner: String!, $repo: String!){\n${queries.join('\n')}\n}`;
}

function sampleActions(actions) {
  const sampledActions = [];
  while (sampledActions.length < 10) {
    sampledActions.push(actions[Math.floor(Math.random() * actions.length)]);
  }
  console.log(sampledActions);
  return sampledActions;
}

function getParam(param, cupcakeIpsum, data) {
  if (['owner', 'repo', 'number'].includes(param.name)) {
    return undefined;
  }

  if (data) {
    if (param.name === 'assignees' && data.assignableUsers && data.assignableUsers.nodes.length > 0) {
      return data.assignableUsers.nodes.map(node => node.login);
    }
  }

  if (!param.required && !param.enum) {
    return undefined;
  }

  if (param.enum) {
    return param.enum[Math.floor(Math.random() * param.enum.length)];
  }

  if (param.name === 'tag_name') {
    return `v${Math.floor((Math.random() * 10000))}`;
  }

  if (param.type === 'string') {
    const LENGTH = 50;
    const randPosition = Math.floor((Math.random() * 1000) + 1);
    const cupcake = cupcakeIpsum.substring(randPosition - LENGTH, randPosition);
    if (param.name === 'content') {
      return Buffer.from(cupcake).toString('base64');
    }
    return cupcake;
  }
  return undefined;
}


async function getParams(action, data) {
  const cupcakeIpsum = await readFile('lib/cupcake.txt', 'utf8');
  const params = {};
  action.params.forEach((param) => {
    let paramValue;
    if (data && data[camelCase(action.name)]) {
      paramValue = getParam(param, cupcakeIpsum, data[camelCase(action.name)]);
    } else {
      paramValue = getParam(param, cupcakeIpsum);
    }
    if (paramValue) {
      params[param.name] = paramValue;
    }
  });
  console.log(params);
  return params;
}

module.exports = async function startChaos({ owner, repo, github }) {
  const routes = JSON.parse(await readFile('lib/relevant-routes.json'));
  const allActions = [...REQUIRES_REPO];
  const actions = sampleActions(allActions).map(action => routes[action]);
  const query = await createGraphQLQuery(actions);
  let data;
  if (query) {
    console.log(query);
    const response = await github.query(query, { owner, repo });
    console.log(response);
    data = response;
  }
  await Promise.all(actions.map(async (action) => {
    try {
      await github.request({
        method: action.method,
        url: action.path,
        headers: {
          accept: PREVIEW_HEADERS.join(''),
        },
        owner,
        repo,
        ...await getParams(action, data),
      });
    } catch (err) {
      console.log(action.name, err.message);
    }
  }));
}