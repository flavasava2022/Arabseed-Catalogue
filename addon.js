const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('./manifest');
const { getMovies, getMovieMeta, getMovieStreams } = require('./scrapers/movies');
const { getSeries, getSeriesMeta, getSeriesStreams } = require('./scrapers/series');

const builder = new addonBuilder(manifest);

const catalogHandler = async ({ type, id, extra }) => {
  const skip = extra?.skip ? parseInt(extra.skip) : 0;
if (type === 'movie' && id === 'arabseed-arabic-movies') {
  return {
    metas: [
      {
        id: "asd:test-movie",
        type: "movie",
        name: "Test Movie",
        poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Red_Apple.jpg/440px-Red_Apple.jpg",
        description: "Testing Stremio Web rendering.",
        releaseInfo: "2025"
      }
    ]
  };
}
  if (type === 'series' && id === 'arabseed-arabic-series') {
    const metas = await getSeries(skip);
    return { metas };
  }
  return { metas: [] };
};

const metaHandler = async ({ type, id }) => {
  if (type === 'movie') return { meta: await getMovieMeta(id) };
  if (type === 'series') return { meta: await getSeriesMeta(id) };
  return { meta: null };
};

const streamHandler = async ({ type, id }) => {
  if (type === 'movie') return { streams: await getMovieStreams(id) };
  if (type === 'series') return { streams: await getSeriesStreams(id) };
  return { streams: [] };
};

builder.defineCatalogHandler(catalogHandler);
builder.defineMetaHandler(metaHandler);
builder.defineStreamHandler(streamHandler);

module.exports = {
  manifest,
  catalogHandler,
  metaHandler,
  streamHandler,
};
