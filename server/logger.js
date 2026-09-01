/* eslint-disable no-console */

const chalk = require('chalk');
const ip = require('ip');

const divider = chalk.gray('\n-----------------------------------');

const normalizeError = error => {
  if (!(error instanceof Error)) return error;
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  };
};

const write = (level, event, details = {}) => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: process.env.SERVICE_NAME || 'ris-web',
    environment: process.env.NODE_ENV || 'development',
    event,
    ...details,
  };
  const output = JSON.stringify(record, (key, value) => (value instanceof Error ? normalizeError(value) : value));
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
};

/**
 * Logger middleware, you can customize it to make messages more personal
 */
const logger = {
  info: (event, details) => write('info', event, details),

  warn: (event, details) => write('warn', event, details),

  // Called whenever there's an error on the server we want to print
  error: (error, details = {}) => write('error', details.event || 'server_error', { ...details, error: normalizeError(error) }),

  audit: (event, details) => write('info', event, { audit: true, ...details }),

  // Called when express.js app starts on given port w/o errors
  appStarted: (port, host, tunnelStarted) => {
    console.log(`Server started ! ${chalk.green('✓')}`);

    // If the tunnel started, log that and the URL it's available at
    if (tunnelStarted) {
      console.log(`Tunnel initialised ${chalk.green('✓')}`);
    }

    console.log(`
${chalk.bold('Access URLs:')}${divider}
Localhost: ${chalk.magenta(`http://${host}:${port}`)}
      LAN: ${chalk.magenta(`http://${ip.address()}:${port}`)
        + (tunnelStarted
          ? `\n    Proxy: ${chalk.magenta(tunnelStarted)}`
          : '')}${divider}
${chalk.blue(`Press ${chalk.italic('CTRL-C')} to stop`)}
${chalk('Webpack is building script...')}
    `);
  },
};

module.exports = logger;
