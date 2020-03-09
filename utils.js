const fs = require("fs");
const chalk = require("chalk");

module.exports = {
  getConfig: file => {
    const defaultConfig = require("./config");
    try {
      fs.accessSync(file, fs.constants.R_OK);
      return Object.assign({}, defaultConfig, require(file));
    } catch (err) {
      console.log(chalk.red(`Unable to locate the config file "${file}"`));
      process.exit(1);
    }
  },
  getRandom: value => {
    if (Array.isArray(value)) {
      if (value.length) {
        return value[Math.floor(Math.random() * value.length)];
      }
      return null;
    }
    return value;
  },
  resolve: async (value, page = null) => {
    if (typeof value === "function" && page) {
      return await value(page);
    }
    return value;
  },
  log: function() {
    console.log(...arguments, new Date().toISOString());
  }
};
