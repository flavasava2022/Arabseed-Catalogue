const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://a.asd.homes';
const SERIES_CATEGORY = '/category/arabic-series-6/';

async function getSeries(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${SERIES_CATEGORY}page/${page}/` : `${BASE_URL}${SERIES_CATEGORY}`;
    
    console.log('Fetching series from:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

      // Generate ID from URL
      const urlParts = seriesUrl.split('/').filter(Boolean);
      const slug = urlParts[urlParts.length - 1];
      const id = 'asd:' + slug;

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
    const seriesSlug = id.replace('asd:', '');
    const url = `${BASE_URL}/${seriesSlug}/`;
    
    console.log('Fetching series meta from:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
        
        videos.push({
          id: `${id}:1:${episodeNum}`,
          title: `الحلقة ${episodeNum}`,
          season: 1,
          episode: episodeNum,
          released: new Date().toISOString()
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
    return null;
  }
}

async function getSeriesStreams(id) {
  try {
    const parts = id.split(':');
    const seriesSlug = parts[1];
    
    // Construct episode URL - may need adjustment
    const episodeUrl = `${BASE_URL}/${seriesSlug}/`;
    
    console.log('Fetching series streams from:', episodeUrl);
    
    const response = await axios.get(episodeUrl);
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
