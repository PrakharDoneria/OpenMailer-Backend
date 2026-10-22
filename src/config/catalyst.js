const catalyst = require("zcatalyst-sdk-node");

function getCatalystApp(req) {
  return catalyst.initialize(req);
}

module.exports = { getCatalystApp };
