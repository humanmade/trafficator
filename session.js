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
  await page.setUserAgent(userAgent.toString());

  // Apply custom request headers.
  Object.entries(config.headers || {}).map(async ([header, value]) => {
    const content = await resolve(getRandom(value) || "");
    await page.setExtraHTTPHeaders({
      [header]: content
    });
  });

  // Track steps.
  let currentStep = 0;

  // Handle session end.
  let completer;
  const completePromise = new Promise( ( resolve, reject ) => {
    completer = { resolve, reject };
  } );
  let didDone = false;
  const done = async () => {
    if ( didDone ) {
      return;
    }
    didDone = true;

    log("session_end", sessionId);
    const timeOnPage = await resolve(funnel.timeOnPage || 2000, page);
    await page.waitForTimeout(timeOnPage);
    await page.close({
      runBeforeUnload: true
    });
    await browser.close();
    completer.resolve();
    return;
  };

  // Do steps.
  const doStep = async () => {
    try {
      // Safety net.
      if (!funnel.steps || !funnel.steps[currentStep]) {
        await done();
        return;
      }

      log("funnel_step_start", sessionId, currentStep);
      const step = funnel.steps[currentStep];
      const probability = await resolve(step.probability || 1, page);

      // Finish session if probability not met.
      if (Math.random() > probability) {
        log("funnel_stop", sessionId, step.name || currentStep);
        await done();
        return;
      }

      log("funnel_step_action", sessionId, step.name || currentStep);
      await step.action(page);

      // Increment step.
      currentStep++;

      // If a page load won't be triggered then call next step.
      if (step.willNotNavigate) {
        await doStep();
      }
    } catch (error) {
      log("funnel_step_error", sessionId, error);
      await done();
    }
  };

  // Navigation handler.
  let didFail = false;
  page.on("load", async () => {
    if ( didFail ) {
      await done();
      return;
    }

    log("page_loaded", sessionId, page.url());

    // Stay on page for configured time, default to 2 seconds.
    const timeOnPage = await resolve(funnel.timeOnPage || 2000, page);
    await page.waitForTimeout(timeOnPage);

    // Proceed to next step.
    await doStep();
  });

  page.on("console", msg => {
    log("console:" + msg.type(), sessionId, msg.text(), msg.stackTrace());
  });

  page.on("error", e => {
    log("error", e.message);
    didFail = true;
  });

  page.on("requestfailed", e => {
    if ( e.url() === page.url() ) {
      log("request_failed", e.url(), page.url(), e.failure().errorText);
      didFail = true;
    }
  });

  page.on("requestfinished", e => {
    if ( ! e.response().ok() ) {
      log("response_error", e.response().status(), e.response().statusText());
      didFail = true;
    }
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
    await done();
  } finally {
    await completePromise;
  }
});
