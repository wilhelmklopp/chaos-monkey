
const startChaos = require('./lib/start-chaos');

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
    if (comesFromChaosMonkey(context)) {
      return;
    }
    await startChaos({ ...context.repo(), github: context.github });
  });
};
