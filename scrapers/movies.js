const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://a.asd.homes';
const MOVIES_CATEGORY = '/category/arabic-movies-6/';

async function getMovies(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${MOVIES_CATEGORY}page/${page}/` : `${BASE_URL}${MOVIES_CATEGORY}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const movies = [];

    $('.movie__block').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3').text().trim();
      const posterUrl = $elem.find('img').attr('src') || $elem.find('img').attr('data-src');
      const movieUrl = $elem.attr('href');
      const description = $elem.find('.post__info p').text().trim();
      const genre = $elem.find('.__genre').text().trim();
      const year = extractYear(title);

      // Generate unique ID from URL
      const id = 'asd:' + movieUrl.split('/').filter(Boolean).pop();

      movies.push({
        id: id,
        type: 'movie',
        name: title,
        poster: posterUrl,
        posterShape: 'poster',
        description: description || 'فيلم عربي',
        genres: genre ? [genre] : ['دراما'],
        year: year,
        links: [movieUrl]
      });
    });

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
    
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    return {
      id: id,
      type: 'movie',
      name: $('.post__title h1').text().trim(),
      poster: $('.post__image img').attr('src'),
      description: $('.story__text').text().trim(),
      genres: $('.genre__item').map((i, el) => $(el).text().trim()).get(),
      year: $('.release-year').text().trim(),
      imdbRating: $('.imdb__rating').text().trim()
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
    
    const response = await axios.get(watchUrl);
    const $ = cheerio.load(response.data);

    const streams = [];
    
    // Extract video sources from page
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
    console.error('Error fetching movie streams:', error.message);
    return [];
  }
}

function extractYear(title) {
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : null;
}

module.exports = { getMovies, getMovieMeta, getMovieStreams };
