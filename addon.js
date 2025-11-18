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
        id: "asd:%d9%81%d9%8a%d9%84%d9%85-%d8%a7%d8%ad%d9%84%d9%89-%d8%a7%d9%84%d8%a7%d9%88%d9%82%d8%a7%d8%aa-2004",
        type: "movie",
        name: "احلى الاوقات ( 2004 )",
        poster: "https://a.asd.homes/wp-content/uploads/2025/11/Best-Times-2004-300x450.webp",
        description: "تقرر (سلمى) مغادرة منزل أمها عقب وفاتها، أنها لا ترغب أن تعيش مع زوج أمها (ربيع)...",
        releaseInfo: "",
        links: ["https://a.asd.homes/%d9%81%d9%8a%d9%84%d9%85-%d8%a7%d8%ad%d9%84%d9%89-%d8%a7%d9%84%d8%a7%d9%88%d9%82%d8%a7%d8%aa-2004/"]
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
