require('dotenv').config();
const GitHubAPI = require('probot/lib/github');
const { findPrivateKey } = require('probot/lib/private-key');
const githubApp = require('probot/lib/github-app');
const startChaos = require('./start-chaos');
const { isSafe } = require('./safety');

async function main() {
  const pem = findPrivateKey();
  const jwt = githubApp({ id: process.env.APP_ID, cert: pem })();
  console.log(jwt);
  const github = new GitHubAPI();
  github.authenticate({
    type: 'app',
    token: jwt,
  });
  const { data: installations } = await github.apps.getInstallations({ per_page: 100 });
  // for each installation, create an installation token
  await Promise.all(installations.map(async (installation) => {
    const { data: token } = await github.apps.createInstallationToken({
      installation_id: installation.id,
    });
    const installationGitHub = new GitHubAPI();
    installationGitHub.authenticate({ type: 'token', token: token.token });
    const { data } = await installationGitHub.apps.getInstallationRepositories({
      per_page: 100,
    });
    return Promise.all(data.repositories.map(async (repository) => {
      const owner = repository.owner.login;
      const repo = repository.name;
      if (!await isSafe({ owner, repo, github: installationGitHub })) {
        return Promise.resolve();
      }
      return startChaos({
        owner: repository.owner.login,
        repo: repository.name,
        github: installationGitHub,
      });
    }));
  }));
}

main();
