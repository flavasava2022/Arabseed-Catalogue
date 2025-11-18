const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://a.asd.homes';
const MOVIES_CATEGORY = '/category/arabic-movies-6/';

async function getMovies(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${MOVIES_CATEGORY}page/${page}/` : `${BASE_URL}${MOVIES_CATEGORY}`;
    
    console.log('Fetching movies from:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const movies = [];

    // Use the correct selector: .movie__block (with underscores)
    $('.movie__block').each((i, elem) => {
      const $elem = $(elem);
      
      // Extract movie URL (the <a> tag itself has the href)
      const movieUrl = $elem.attr('href');
      
      // Extract title (from h3 inside post__info)
      const title = $elem.find('.post__info h3').text().trim();
      
      // Extract poster (data-src attribute)
      const posterUrl = $elem.find('.post__image img').attr('data-src') || 
                       $elem.find('.post__image img').attr('src');
      
      // Extract description if available
      const description = $elem.find('.post__info p').text().trim();
      
      // Extract year from title
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? yearMatch[1] : '';

      // Skip if essential data is missing
      if (!movieUrl || !title) {
        console.log('Skipping item - missing URL or title');
        return;
      }

      // Generate unique ID from URL
      const urlParts = movieUrl.split('/').filter(Boolean);
      const slug = urlParts[urlParts.length - 1];
      const id = 'asd:' + slug;

      movies.push({
        id: id,
        type: 'movie',
        name: title,
        poster: posterUrl,
        posterShape: 'poster',
        description: description || `فيلم ${title}`,
        releaseInfo: year,
        links: [movieUrl]
      });
    });

    console.log(`✓ Found ${movies.length} movies`);
    return movies;
    
  } catch (error) {
    console.error('Error fetching movies:', error.message);
    return [];
  }
}

async function getMovieMeta(id) {
  try {
    const movieSlug = id.replace('asd:', '');
    const url = `${BASE_URL}/${movieSlug}/`;
    
    console.log('Fetching movie meta from:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);

    const title = $('.post__title h1').text().trim() || 
                 $('.post__name').text().trim();
    const poster = $('.post__image img').attr('data-src') || 
                  $('.post__image img').attr('src');
    const description = $('.story__text').text().trim() || 
                       $('.post__story').text().trim();
    const year = $('.year').text().trim();

    return {
      id: id,
      type: 'movie',
      name: title,
      poster: poster,
      description: description,
      releaseInfo: year
    };
  } catch (error) {
    console.error('Error fetching movie meta:', error.message);
    return null;
  }
}

async function getMovieStreams(id) {
  try {
    const movieSlug = id.replace('asd:', '');
    const watchUrl = `${BASE_URL}/${movieSlug}/watch/`;
    
    console.log('Fetching movie streams from:', watchUrl);
    
    const response = await axios.get(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const streams = [];
    
    // Extract video sources from iframes
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
    console.error('Error fetching movie streams:', error.message);
    return [];
  }
}

module.exports = { getMovies, getMovieMeta, getMovieStreams };
