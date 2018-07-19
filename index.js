
const startChaos = require('./lib/start-chaos');
const { createSafetyPR, isSafe } = require('./lib/safety');

function comesFromChaosMonkey(context) {
  if (
    context.payload.sender &&
    context.payload.sender.node_id === process.env.GLOBAL_BOT_NODE_ID
  ) {
    return true;
  }
  return false;
}

module.exports = async (app) => {
  app.on('*', async (context) => {
    const { owner, repo } = context.repo();
    if (comesFromChaosMonkey(context) || !await isSafe({ owner, repo, github: context.github })) {
      return;
    }
    await startChaos({ ...context.repo(), github: context.github });
  });
  app.on('installation_repositories.added', (context) => {
    // intentionally only select this one
    const repository = context.payload.repositories_added[0];
    const { github } = context;
    const { installation } = context.payload;
    return createSafetyPR({ owner: installation.account.login, repo: repository.name, github });
  });
  app.on('installation.created', (context) => {
    // intentionally only select this one
    const repository = context.payload.repositories.repositories_added[0];
    const { github } = context;
    const { installation } = context.payload;
    return createSafetyPR({ owner: installation.account.login, repo: repository.name, github });
  });
};
