// two functions. does PR exist and create PR

async function createSafetyPR({ owner, repo, github }) {
  const reference = await github.gitdata.getReference({
    ref: 'heads/master',
    owner,
    repo,
  });

  const { sha } = reference.data.object;

  const branch = 'chaos-monkey-hello';
  await github.gitdata.createReference({
    ref: `refs/heads/${branch}`,
    sha,
    owner,
    repo,
  });

  await github.repos.createFile({
    path: '.github/chaos-monkey.yml',
    message: 'Enable chaos monkey',
    content: Buffer.from('chaos-monkey: enabled').toString('base64'),
    branch,
    owner,
    repo,
  });
  return github.pullRequests.create({
    title: 'Merge this PR to activate Chaos Monkey',
    head: branch,
    base: 'master',
    body: `# ⚠️️️️ ⚠️️️️ ⚠️️️️ Warning
Merging this PR will activate Chaos Monkey.
If this is not a test repository you should close this PR **immediately**
Chaos Monkey is dangerous and will create chaos on your repo!
You can only install Chaos Monkey on one repo at a time. You **cannot** install it on all repos in an org.
`,
    maintainer_can_modify: true,
    owner,
    repo,
  });
}

async function isSafe({ owner, repo, github }) {
  try {
    const result = await github.repos.getContent({ owner, repo, path: '.github/chaos-monkey.yml' });
    const content = Buffer.from(result.data.content, 'base64').toString('ascii');
    if (content === 'chaos-monkey: enabled') {
      return true;
    }
    return false;
  } catch (err) {
    if (err && err.code === 404) {
      return false;
    }
    throw err;
  }
}

module.exports = {
  createSafetyPR,
  isSafe,
};
