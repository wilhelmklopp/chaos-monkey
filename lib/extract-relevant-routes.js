const { promisify } = require('util');
const fs = require('fs');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function main() {
  const routes = JSON.parse(await readFile('lib/routes.json'));

  const relevantRoutes = {};

  const relevantCategories = [
    // 'checks', Add these two back when the time is right
    // 'git',
    'issues',
    'codesOfConduct',
    'gitignore',
    'licenses',
    'projects',
    'pulls',
    'reactions',
    'repos',
    'search',
    'users',
  ];
  const excluded = [
    'Create an organization project',
    'Create a comment (alternative)',
    'Add user as a collaborator',
    'Create a new repository for the authenticated user',
    'Create a new repository in this organization',
    'Update required status checks of protected branch',
    'Replace required status checks contexts of protected branch',
    'Add required status checks contexts of protected branch',
    'Update pull request review enforcement of protected branch',
    'Add required signatures of protected branch',
    'Add admin enforcement of protected branch',
    'Replace team restrictions of protected branch',
    'Add team restrictions of protected branch',
    'Replace user restrictions of protected branch',
    'Add user restrictions of protected branch',
    'Update branch protection',
    'Update a repository invitation',
  ];
  relevantCategories.forEach((category) => {
    const relevantVerbs = [
      'PUT',
      'PATCH',
      'POST',
    ];
    routes[category].forEach((route) => {
      if (
        relevantVerbs.includes(route.method) &&
        route.enabledForApps &&
        !excluded.includes(route.name)
      ) {
        relevantRoutes[route.name] = route;
      }
    });
  });
  await writeFile('lib/relevant-routes.json', JSON.stringify(relevantRoutes, null, 2));
  Object.keys(relevantRoutes).forEach(routeName => console.log(`${routeName}: ${relevantRoutes[routeName].method} ${relevantRoutes[routeName].path}`));
}


main();
