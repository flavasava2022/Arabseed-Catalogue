// addon.js
const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const { getMovies, getMovieMeta, getMovieStreams } = require('./scrapers/movies');
const { getSeries, getSeriesMeta, getSeriesStreams } = require('./scrapers/series');

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const skip = extra?.skip ? parseInt(extra.skip) : 0;
  if (type === 'movie' && id === 'arabseed-arabic-movies') {
    return { metas: await getMovies(skip) };
  }
  if (type === 'series' && id === 'arabseed-arabic-series') {
    return { metas: await getSeries(skip) };
  }
  return { metas: [] };
});

builder.defineMetaHandler(async ({ type, id }) => {
  if (type === 'movie') return { meta: await getMovieMeta(id) };
  if (type === 'series') return { meta: await getSeriesMeta(id) };
  return { meta: null };
});

builder.defineStreamHandler(async ({ type, id }) => {
  if (type === 'movie') return { streams: await getMovieStreams(id) };
  if (type === 'series') return { streams: await getSeriesStreams(id) };
  return { streams: [] };
});

// Export the interface object directly
module.exports = builder.getInterface();
