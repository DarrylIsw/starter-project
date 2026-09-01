/* eslint consistent-return:0 import/order:0 */

require('dotenv').config({ quiet: true });
const express = require('express');
const logger = require('./logger');
const favicon = require('serve-favicon');
const path = require('path');
const rawicons = require('./rawicons');
const rawdocs = require('./rawdocs');
const argv = require('./argv');
const port = require('./port');
const setup = require('./middlewares/frontendMiddleware');
const apiRoutes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');
const requestContext = require('./middlewares/requestContext');
const auditTrail = require('./middlewares/auditTrail');
const { apiNotFound, errorHandler } = require('./middlewares/errorHandler');
const { optionalUser } = require('./middlewares/auth');
const emailDeliveryService = require('./services/emailDeliveryService');
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel
  ? require('ngrok')
  : false;
const { resolve } = require('path');
const app = express();

app.disable('x-powered-by');
app.use('/api', requestContext);
app.use('/api', requestLogger);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', optionalUser);
app.use('/api', auditTrail);

// Load material icons
app.use('/api/icons', (req, res) => {
  res.json({
    records: [
      { source: rawicons(req.query) }
    ]
  });
});

// Load code preview
app.use('/api/docs', (req, res) => {
  res.json({
    records: [
      { source: rawdocs(req.query) }
    ]
  });
});

app.use('/api', apiRoutes);
app.use('/api', apiNotFound);
app.use('/api', errorHandler);

app.use('/', express.static('public', { etag: false }));
app.use(favicon(path.join('public', 'favicons', 'favicon.ico')));

// In production we need to pass these values in instead of relying on webpack
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// get the intended host and port number, use localhost and port 3000 if not provided
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Let http.Server use its default IPv6/4 host
const prettyHost = customHost || 'localhost';

// use the gzipped bundle
app.get('*.js', (req, res, next) => {
  req.url = req.url + '.gz'; // eslint-disable-line
  res.set('Content-Encoding', 'gzip');
  next();
});

const startServer = () => app.listen(port, host, async err => {
  if (err) return logger.error(err.message);

  emailDeliveryService.start();

  // Connect to ngrok in dev mode
  if (ngrok) {
    let url;
    try {
      url = await ngrok.connect(port);
    } catch (e) {
      return logger.error(e);
    }
    logger.appStarted(port, prettyHost, url);
  } else {
    logger.appStarted(port, prettyHost);
  }
});

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
