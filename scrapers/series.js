const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://a.asd.homes';
const SERIES_CATEGORY = '/category/arabic-series-6/';

async function getSeries(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${SERIES_CATEGORY}page/${page}/` : `${BASE_URL}${SERIES_CATEGORY}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const series = [];

    $('.movie__block').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3').text().trim();
      const posterUrl = $elem.find('img').attr('src') || $elem.find('img').attr('data-src');
      const seriesUrl = $elem.attr('href');
      const description = $elem.find('.post__info p').text().trim();
      const genre = $elem.find('.__genre').text().trim();

      // Extract series ID from URL
      const id = 'asd:' + seriesUrl.split('/').filter(Boolean).pop();

      series.push({
        id: id,
        type: 'series',
        name: title,
        poster: posterUrl,
        posterShape: 'poster',
        description: description || 'مسلسل عربي',
        genres: genre ? [genre] : ['دراما'],
        links: [seriesUrl]
      });
    });

    return series;
  } catch (error) {
    console.error('Error fetching series:', error.message);
    return [];
  }
}

async function getSeriesMeta(id) {
  try {
    const seriesSlug = id.replace('asd:', '');
    const url = `${BASE_URL}/${seriesSlug}/`;
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract seasons and episodes
    const videos = [];
    $('.episodes__list .episode__item, .seasons__list .season__item').each((i, elem) => {
      const $elem = $(elem);
      const episodeTitle = $elem.find('.episode__title').text().trim();
      const episodeUrl = $elem.find('a').attr('href');
      
      if (episodeUrl) {
        const match = episodeTitle.match(/الحلقة\s+(\d+)|Episode\s+(\d+)/i);
        const episodeNum = match ? (match[1] || match[2]) : i + 1;
        
        videos.push({
          id: id + ':1:' + episodeNum,
          title: episodeTitle,
          season: 1,
          episode: parseInt(episodeNum),
          released: new Date().toISOString()
        });
      }
    });

    return {
      id: id,
      type: 'series',
      name: $('.post__title h1').text().trim(),
      poster: $('.post__image img').attr('src'),
      description: $('.story__text').text().trim(),
      genres: $('.genre__item').map((i, el) => $(el).text().trim()).get(),
      videos: videos
    };
  } catch (error) {
    console.error('Error fetching series meta:', error.message);
    return null;
  }
}

async function getSeriesStreams(id) {
  try {
    const parts = id.split(':');
    const seriesSlug = parts[1];
    const episodeNum = parts[3];
    
    // Construct episode URL - you may need to adjust this based on actual URL pattern
    const episodeUrl = `${BASE_URL}/${seriesSlug}-الحلقة-${episodeNum}/watch/`;
    
    const response = await axios.get(episodeUrl);
    const $ = cheerio.load(response.data);

    const streams = [];
    
    $('iframe').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        streams.push({
          name: 'ArabSeed',
          title: `Server ${i + 1}`,
          url: src
        });
      }
    });

    return streams;
  } catch (error) {
    console.error('Error fetching series streams:', error.message);
    return [];
  }
}

module.exports = { getSeries, getSeriesMeta, getSeriesStreams };
