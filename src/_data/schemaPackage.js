// Version of the installed @designlasagna/schemas package, so the schemas
// overview can show the install command without hardcoding a release.
const pkg = require('@designlasagna/schemas/package.json');

module.exports = { name: pkg.name, version: pkg.version };
