const { addonBuilder } = require('stremio-addon-sdk');
const manifest = require('../manifest');
const { getMovies, getMovieMeta, getMovieStreams } = require('../scrapers/movies');
const { getSeries, getSeriesMeta, getSeriesStreams } = require('../scrapers/series');

const builder = new addonBuilder(manifest);

// Catalog handler
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  console.log(`Catalog request: type=${type}, id=${id}`);
  
  const skip = extra?.skip ? parseInt(extra.skip) : 0;
  
  if (type === 'movie' && id === 'arabseed-arabic-movies') {
    const metas = await getMovies(skip);
    return { metas };
  }
  
  if (type === 'series' && id === 'arabseed-arabic-series') {
    const metas = await getSeries(skip);
    return { metas };
  }
  
  return { metas: [] };
});

// Meta handler
builder.defineMetaHandler(async ({ type, id }) => {
  console.log(`Meta request: type=${type}, id=${id}`);
  
  if (type === 'movie') {
    const meta = await getMovieMeta(id);
    return { meta };
  }
  
  if (type === 'series') {
    const meta = await getSeriesMeta(id);
    return { meta };
  }
  
  return { meta: null };
});

// Stream handler
builder.defineStreamHandler(async ({ type, id }) => {
  console.log(`Stream request: type=${type}, id=${id}`);
  
  let streams = [];
  
  if (type === 'movie') {
    streams = await getMovieStreams(id);
  } else if (type === 'series') {
    streams = await getSeriesStreams(id);
  }
  
  return { streams };
});

module.exports = builder.getInterface();
