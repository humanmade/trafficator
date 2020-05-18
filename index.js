#!/usr/bin/env node
/**
 * Traffic generator based on Puppeteer.
 */

const path = require("path");
const { spawn, Worker, Pool } = require("threads");
const chalk = require("chalk");
const yargs = require("yargs");
const { getConfig } = require("./utils");

// Parse args.
const argv = yargs
  .option("config", {
    alias: "cfg",
    description: "The config file path",
    type: "string",
    default: ".trafficator.js",
    coerce: file => {
      return path.resolve(file);
    }
  })
  .option("concurrency", {
    alias: "c",
    description:
      "The number of sessions to run simultaneously. A higher number will use more resources but will complete more quickly.",
    type: "number"
  })
  .option("sessions", {
    alias: "s",
    description: "Number of sessions to run.",
    type: "number"
  })
  .option("verbose", {
    alias: "v",
    description: "Whether to output full logs.",
    type: "boolean",
    default: false
  })
  .help()
  .alias("help", "h").argv;

// Read config in.
const config = getConfig(argv.config);

// Set overrides.
if (argv.sessions) {
  config.sessions = argv.sessions;
}
if (argv.concurrency) {
  config.concurrency = argv.concurrency;
}

// Track stats.
const start = Date.now();

// Get output stats.
const end = () => {
  console.log(chalk.green(`Time elapsed: ${(Date.now() - start) / 1000}s`));
  process.exit(0);
};

// Pre-flight.
if (!config.funnels.length) {
  console.log(chalk.red("You must configure at least one funnel object"));
  process.exit(1);
}
if (!Array.isArray(config.funnels)) {
  console.log(chalk.red(".funnels must be an array"));
  process.exit(1);
}

// Quaid... start the reactor.
(async () => {
  // Create worker pool.
  const pool = Pool(() => {
    const worker = new Worker("./session");
    worker.on('error', e => {
      console.log(e);
    });
    return spawn( worker );
  }, config.concurrency);

  // Queue sessions.
  for (i = 0; i < config.sessions; i++) {
    const sessionId = i + 1;
    pool.queue(async session => {
      await session(argv.config, sessionId);
    });
  }

  await pool.completed();
  await pool.terminate();
  end();
})();
