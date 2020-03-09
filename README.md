# Trafficator 

[![npm version](https://badge.fury.io/js/trafficator.svg)](https://www.npmjs.com/package/trafficator)

A simple web traffic generator built on Puppeteer for local analytics testing.

## Intallation

```bash
npm install trafficator
```

Or globally

```
npm install --global trafficator
```

## Usage

Trafficator uses Puppeteer under the hood to power interactions and activities on each page.

To get started you need to create a `.trafficator.js` file with at least one funnel configured:

```js
# .trafficator.js

module.exports = {
  funnels: [
    {
      entry: 'https://my-project.local/'
    }
  ]
};
```

This is a minimal example and will instruct Trafficator to open the page at `https://my-project.local/` before closing it and moving on to another session.

Once you have the file you can run the `trafficator` command, either directly from the command line for a global installation or from an npm script for a local installation.

```bash
# See command lines options.
trafficator --help
# Change the configured sessions or concurrency values.
trafficator --sessions 100 --concurrency 10
# Run with a different config file than .trafficator.js.
trafficator --config path/to/config.js
```

### Funnel options

**`entry <string | array>`**

A single URL or array of URLs. If an array is provided one will be chosen at random.

**`steps <array>`**

An array of step objects.

### Funnel steps

The flexibility of trafficator comes from defining funnel steps. These are a set of instructions for puppeteer to execute in order on the website such as clicking links or other interactions.

```js
module.exports = {
  funnels: [
    {
      entry: 'https://my-project.local/'
      steps: [
        {
          action: async (page) => {
            // Page is the `page` object from Puppeteer.
            await page.click('.main-menu a');
          }
        }
      ]
    }
  ]
};
```

You can define as many steps as you like but at a minimum they must define an `action` callback.

#### Step options

**`name <string>`**

An optional name for the step shown in output logs.

**`action <function>`**

A callback that accepts the `page` puppeteer option. Check the [Puppeteer docs](https://github.com/GoogleChrome/puppeteer) for more details on what you can do.

**`probability <number | function>`**

A number between 1 and 0 or function that resolves to a number, determines the likelihood that the action is carried out. Use this to create a drop off effect at each stage of your funnel.

If `probability` is callback it recieves the `page` object from Puppeteer as an argument allowing you to return a dynamic value, ffor example:

```js
{
  action: async (page) => await page.click('a'),
  probability: async (page) => {
    // Get data from the browser context.
    return await page.evaluate(() => {
      if ( localStorage.getItem('ab_test') === 2 ) {
        // 30% chance.
        return 0.3;
      }
      // 10% chance.
      return 0.1;
    });
  }
}
```

**`willNotNavigate <boolean>`**

Trafficator makes the assumption that action callbacks will trigger a navigation event, in which case the steps are advanced automatically.

If the action does not navigate set `willNotNavigate` to `true` so that the next step is run.

## Full configuration example

```js
module.exports = {
  // <integer>: number of sessions to run
  sessions: 10,
  // <integer>: number of concurrent sessions
  concurrency: 5,
  // <array>: funnel definitions
  funnels: [
    // <object>: funnel object
    {
      // <string|array>: entry point URL.
      entry: 'https://my-project.local/',
      // <array>: step objects
      steps: [
        // <object>: step object
        {
          // <string>: step name
          name: 'Scroll down',
          // <function>: step action callback
          action: async page => await page.evaluate(() => {
            window.scrollTo(0, 500);
          }),
          // <boolean>: whether the action callback causes a navigation event
          willNotNavigate: true
        },
        {
          name: 'Click target link',
          action: async page => await page.click('a.target'),
          // <number|function>: probability of drop-off
          probability: 0.5
        }
      ]
    }
  ],
  // array: custom referrers added sent with the entry page request
  referer: [
    // string: referrer URL
    '',
    'https://www.google.com/',
    'https://twitter.com/',
  ],
  // object: configuration for the user-agents library.
  browsers: {}
};
```

### Browsers / User Agents

User agent support is provided by the [`user-agents`](https://www.npmjs.com/package/user-agents) library. By default this will choose a random user agent string for the visitors based on common distributions.

The `user-agents` library accepts a configuration object that can be passed by settings the `browsers` property in your `.trafficator.js` config file.

For example to select only mobile device user agents strings you could do the following:

```js
module.exports = {
  funnels: [
    {
      entry: 'https://example.org'
    }
  ],
  browsers: {
    deviceCategory: 'mobile'
  }
};
```

You can find more complete configuration information on the `user-agents` repository.

## Roadmap

This is a simple initial iteration and there's much more it could do in future. This includes:

- Device emulation
- Campaigns eg. `utm_source`, `utm_campaign`
- Geo location
- Customisable request headers
- Ability to define trends or random chance for all of the above

------------------

Made with ❤️ by [Human Made](https://humanmade.com/)
