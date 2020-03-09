/**
 * Worker file to run the browser session.
 */
const { expose } = require("threads/worker");
const puppeteer = require("puppeteer");
const { getConfig, resolve, getRandom, log } = require("./utils");
const UserAgent = require("user-agents");

expose(async (configFile, sessionId) => {
  const config = getConfig(configFile);
  const funnel = getRandom(config.funnels);
  const browser = await puppeteer.launch({});
  const page = await browser.newPage();

  if (!funnel.entry) {
    throw "funnel.entry must be defined and must be a valid URL.";
  }

  // Get start point and referer.
  const entry = await resolve(getRandom(funnel.entry), page);
  const referer = await resolve(
    getRandom(funnel.referer || config.referer || ""),
    page
  );

  // Set a random user agent.
  const userAgent = new UserAgent(config.browsers || {});
  page.setUserAgent(userAgent.toString());

  // Track steps.
  let currentStep = 0;

  // Handle session end.
  const done = async () => {
    log("session_end", sessionId);
    const timeOnPage = await resolve(funnel.timeOnPage || 2000, page);
    await page.waitFor(timeOnPage);
    await page.close({
      runBeforeUnload: true
    });
    await browser.close();
    return;
  };

  // Do steps.
  const doStep = async () => {
    try {
      // Safety net.
      if (!funnel.steps[currentStep]) {
        done();
        return;
      }

      log("funnel_step_start", sessionId, currentStep);
      const step = funnel.steps[currentStep];
      const probability = await resolve(step.probability || 1, page);

      // Finish session if probability not met.
      if (Math.random() > probability) {
        log("funnel_stop", sessionId, step.name || currentStep);
        done();
        return;
      }

      log("funnel_step_action", sessionId, step.name || currentStep);
      await step.action(page);

      // If a page load won't be triggered then call next step.
      if (funnel.willNotNavigate) {
        await doStep();
      }
    } catch (error) {
      log("funnel_step_error", sessionId, error);
      done();
    }

    // Increment step.
    currentStep++;
  };

  // Navigation handler.
  page.on("load", async () => {
    log("page_loaded", sessionId, page.url());

    // Stay on page for configured time, default to 2 seconds.
    const timeOnPage = await resolve(funnel.timeOnPage || 2000, page);
    await page.waitFor(timeOnPage);

    // Proceed to next step.
    await doStep();
  });

  log("session_start", sessionId, {
    entry,
    referer
  });

  // First page view.
  try {
    await page.goto(entry, {
      referer
    });
  } catch (error) {
    log("session_start_error", sessionId, error);
    done();
  }
});
