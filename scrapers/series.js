const axios = require("axios");
const cheerio = require("cheerio");
const Buffer = require("buffer").Buffer;

const BASE_URL = "https://a.asd.homes";
const SERIES_CATEGORY = "/category/arabic-series-6/";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function getSeries(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url = page > 1 ? `${BASE_URL}${SERIES_CATEGORY}page/${page}/` : `${BASE_URL}${SERIES_CATEGORY}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const series = [];

    $(".movie__block").each((i, elem) => {
      const $elem = $(elem);
      const seriesUrl = $elem.attr("href");
      const title = $elem.find(".post__info h3").text().trim();
      const posterUrl = $elem.find(".post__image img").attr("data-src") || $elem.find(".post__image img").attr("src");
      const description = $elem.find(".post__info p").text().trim();

      if (!seriesUrl || !title) return;

      const validPoster = posterUrl && posterUrl.startsWith("http") ? posterUrl : undefined;
      const id = "asd:" + Buffer.from(seriesUrl).toString("base64");

      series.push({
        id,
        type: "series",
        name: title,
        poster: validPoster,
        posterShape: "poster",
        description: description || `مسلسل ${title}`
      });
    });

    console.log(`[DEBUG] Total series parsed: ${series.length}`);
    return series;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch series catalog:`, error);
    return [];
  }
}

// Helper function to fetch episodes with pagination
async function fetchAllEpisodesForTerm(seasonId, seriesUrl) {
  const episodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      console.log(`[DEBUG] Fetching episodes for season ${seasonId}, offset: ${offset}`);
      
      const response = await axios.post(`${BASE_URL}/wp-admin/admin-ajax.php`, 
        new URLSearchParams({
          action: 'seasonepisodes',
          seasonid: seasonId,
          offset: offset
        }), {
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000
      });

      if (response.data && response.data.html) {
        const $ = cheerio.load(response.data.html);
        
        $("a").each((i, elem) => {
          const $elem = $(elem);
          const episodeUrl = $elem.attr("href");
          const episodeTitle = $elem.text().trim();

          if (!episodeUrl) return;

          const match = episodeTitle.match(/\d+/);
          const episodeNum = match ? parseInt(match[0]) : episodes.length + 1;
          const episodeId = `asd:${Buffer.from(episodeUrl).toString("base64")}`;

          episodes.push({
            id: episodeId,
            title: `الحلقة ${episodeNum}`,
            episode: episodeNum,
            released: new Date().toISOString()
          });
        });

        hasMore = response.data.hasmore || false;
        offset += 20;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`[ERROR] Failed to fetch paginated episodes for season ${seasonId}:`, error.message);
      hasMore = false;
    }
  }

  return episodes;
}

async function getSeriesMeta(id) {
  try {
    const seriesUrl = Buffer.from(id.replace("asd:", ""), "base64").toString();
    console.log(`[DEBUG] Fetching series meta from URL: ${seriesUrl}`);

    const response = await axios.get(seriesUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const title = $(".post__title h1").text().trim();
    const posterUrl = $(".poster__single img")?.attr("src") || $(".poster__single img")?.attr("data-src");
    const description = $(".story__text").text().trim();

    // Check if series has multiple seasons
    const seasons = [];
    $("#seasons__list ul li").each((i, elem) => {
      const $elem = $(elem);
      const seasonTerm = $elem.attr("data-term");
      const seasonName = $elem.find("span").text().trim();
      
      if (seasonTerm) {
        seasons.push({
          term: seasonTerm,
          name: seasonName,
          number: i + 1
        });
      }
    });

    console.log(`[DEBUG] Found ${seasons.length} seasons`);

    let allVideos = [];

    if (seasons.length > 0) {
      // Multi-season series
      for (const season of seasons) {
        console.log(`[DEBUG] Processing ${season.name} (term: ${season.term})`);
        const seasonEpisodes = await fetchAllEpisodesForTerm(season.term, seriesUrl);
        
        // Add season number to each episode
        seasonEpisodes.forEach(ep => {
          ep.season = season.number;
        });
        
        allVideos.push(...seasonEpisodes);
      }
    } else {
      // Single season series - get initial episodes and check for "load more"
      const initialEpisodes = [];
      
      $(".episodes__list a, .seasons__list a").each((i, elem) => {
        const $elem = $(elem);
        const episodeUrl = $elem.attr("href");
        const episodeTitle = $elem.text().trim();

        if (!episodeUrl) return;

        const match = episodeTitle.match(/\d+/);
        const episodeNum = match ? parseInt(match[0]) : i + 1;
        const episodeId = `asd:${Buffer.from(episodeUrl).toString("base64")}`;

        initialEpisodes.push({
          id: episodeId,
          title: `الحلقة ${episodeNum}`,
          season: 1,
          episode: episodeNum,
          released: new Date().toISOString()
        });
      });

      // Check if there's a "load more" button
      const loadMoreButton = $(".load__more__episodes");
      if (loadMoreButton.length > 0) {
        const postId = loadMoreButton.attr("data-id");
        console.log(`[DEBUG] Found load more button with post ID: ${postId}`);
        
        const additionalEpisodes = await fetchAllEpisodesForTerm(postId, seriesUrl);
        additionalEpisodes.forEach(ep => {
          ep.season = 1;
        });
        
        allVideos = [...initialEpisodes, ...additionalEpisodes];
      } else {
        allVideos = initialEpisodes;
      }
    }

    // Remove duplicates based on episode ID
    const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());
    
    // Sort by season and episode number
    uniqueVideos.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    });

    console.log(`[DEBUG] Total episodes found: ${uniqueVideos.length}`);

    return {
      id,
      type: "series",
      name: title,
      background: posterUrl || undefined,
      description,
      videos: uniqueVideos
    };
  } catch (error) {
    console.error(`[ERROR] Failed to fetch series meta for ID ${id}:`, error);
    return { meta: {} };
  }
}

async function getSeriesStreams(id) {
  try {
    const encodedEpisodeUrl = id.split(":")[1];
    if (!encodedEpisodeUrl) {
      console.log(`[DEBUG] No URL found in series stream ID: ${id}`);
      return [];
    }

    const episodeUrl = Buffer.from(encodedEpisodeUrl, "base64").toString();
    console.log(`[DEBUG] Fetching streams from episode URL: ${episodeUrl}`);

    const response = await axios.get(episodeUrl, {
      headers: { "User-Agent": USER_AGENT }
    });

    const $ = cheerio.load(response.data);
    const streams = [];

    $("iframe").each((i, elem) => {
      const src = $(elem).attr("src");
      if (src) {
        console.log(`[DEBUG] Found stream iframe src: ${src}`);
        streams.push({
          name: "ArabSeed",
          title: `خادم ${i + 1}`,
          url: src
        });
      }
    });

    console.log(`[DEBUG] Total streams found: ${streams.length}`);
    return streams;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch series streams for ID ${id}:`, error);
    return [];
  }
}

module.exports = { getSeries, getSeriesMeta, getSeriesStreams };
