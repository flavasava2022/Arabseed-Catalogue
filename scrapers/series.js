const axios = require('axios');
const cheerio = require('cheerio');
const Buffer = require('buffer').Buffer;

const BASE_URL = 'https://a.asd.homes';
const SERIES_CATEGORY = '/category/arabic-series-6/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function getSeries(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${SERIES_CATEGORY}page/${page}/` : `${BASE_URL}${SERIES_CATEGORY}`;
    console.log('Fetching series from:', url);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 15000
    });
    const $ = cheerio.load(response.data);
    const series = [];

    // Use the same selector as movies
    $('.movie__block').each((i, elem) => {
      const $elem = $(elem);

      const seriesUrl = $elem.attr('href');
      const title = $elem.find('.post__info h3').text().trim();
      const posterUrl = $elem.find('.post__image img').attr('data-src') ||
                        $elem.find('.post__image img').attr('src');
      const description = $elem.find('.post__info p').text().trim();

      if (!seriesUrl || !title) return;

      // Encode the full URL to base64 for consistent ID usage
      const id = 'asd:' + Buffer.from(seriesUrl).toString('base64');

      series.push({
        id: id,
        type: 'series',
        name: title,
        poster: posterUrl,
        posterShape: 'poster',
        description: description || `مسلسل ${title}`,
        links: [seriesUrl]
      });
    });

    console.log(`✓ Found ${series.length} series`);
    return series;

  } catch (error) {
    console.error('Error fetching series:', error.message);
    return [];
  }
}

async function getSeriesMeta(id) {
  try {
    const seriesUrl = Buffer.from(id.replace('asd:', ''), 'base64').toString();
    const url = `${seriesUrl}`;
    console.log('Fetching series meta from:', url);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract episodes
    const videos = [];
    $('.episodes__list a, .seasons__list a').each((i, elem) => {
      const $elem = $(elem);
      const episodeUrl = $elem.attr('href');
      const episodeTitle = $elem.text().trim();

      if (episodeUrl) {
        // Extract episode number
        const match = episodeTitle.match(/\d+/);
        const episodeNum = match ? parseInt(match[0]) : i + 1;

        // Use full base64 encoded episode URL in the ID
        const episodeId = `asd:${Buffer.from(episodeUrl).toString('base64')}`;

        videos.push({
          id: episodeId,
          title: `الحلقة ${episodeNum}`,
          season: 1,
          episode: episodeNum,
          released: new Date().toISOString(),
        });
      }
    });

    const title = $('.post__title h1').text().trim();
    const poster = $('.post__image img').attr('data-src') ||
                   $('.post__image img').attr('src');
    const description = $('.story__text').text().trim();

    return {
      id: id,
      type: 'series',
      name: title,
      poster: poster,
      description: description,
      videos: videos
    };
  } catch (error) {
    console.error('Error fetching series meta:', error.message);
    return { meta: {} };
  }
}

async function getSeriesStreams(id) {
  try {
    // The id is like `asd:<episodeEncodedUrl>`
    const encodedEpisodeUrl = id.split(':')[1];
    if (!encodedEpisodeUrl) return { streams: [] };

    const episodeUrl = Buffer.from(encodedEpisodeUrl, 'base64').toString();
    console.log('Fetching series streams from:', episodeUrl);

    const response = await axios.get(episodeUrl, {
      headers: { 'User-Agent': USER_AGENT }
    });

    const $ = cheerio.load(response.data);

    const streams = [];
    $('iframe').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        streams.push({
          name: 'ArabSeed',
          title: `خادم ${i + 1}`,
          url: src
        });
      }
    });

    console.log(`✓ Found ${streams.length} streams`);
    return streams;
  } catch (error) {
    console.error('Error fetching series streams:', error.message);
    return [];
  }
}

module.exports = { getSeries, getSeriesMeta, getSeriesStreams };
