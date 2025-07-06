const path = require('path');

module.exports = function override(config, env) {
  // Suppress source map warnings specifically for chess.js
  if (!config.ignoreWarnings) {
    config.ignoreWarnings = [];
  }
  
  config.ignoreWarnings.push(
    // Ignore chess.js source map warnings
    {
      module: /node_modules\/chess\.js/,
      message: /Failed to parse source map/,
    },
    // Ignore any source map warnings from node_modules
    function (warning) {
      return (
        warning.module &&
        warning.module.resource &&
        warning.module.resource.includes('node_modules') &&
        warning.message &&
        warning.message.includes('Failed to parse source map')
      );
    }
  );

  // Also exclude chess.js from source-map-loader processing
  const oneOfRule = config.module.rules.find((rule) => rule.oneOf);
  if (oneOfRule) {
    const sourceMapRule = oneOfRule.oneOf.find((rule) =>
      rule.use && rule.use.some(use => 
        use.loader && use.loader.includes('source-map-loader')
      )
    );
    
    if (sourceMapRule) {
      if (!sourceMapRule.exclude) {
        sourceMapRule.exclude = [];
      }
      sourceMapRule.exclude.push(/node_modules\/chess\.js/);
    }
  }

  return config;
};
