const axios = require("axios");
const cheerio = require("cheerio");
const Buffer = require("buffer").Buffer;

const BASE_URL = "https://a.asd.homes";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function fetchAllEpisodesForSeason(seasonId) {
  const episodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Full data for POST request for loading episodes - verify action name exactly and param names
      const postData = new URLSearchParams();
      postData.append("action", "seasonepisodes"); // Confirm 'seasonepisodes' is correct action name
      postData.append("seasonid", seasonId);
      postData.append("offset", offset);

      console.log(`[DEBUG] Sending AJAX POST for episodes. SeasonId: ${seasonId}, Offset: ${offset}`);

      const response = await axios.post(
        `${BASE_URL}/wp-admin/admin-ajax.php`,
        postData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest"
          },
          timeout: 12000,
        }
      );

      if (!response.data || !response.data.html) {
        console.log("[DEBUG] No HTML in response data or empty response.");
        hasMore = false;
        break;
      }

      const $ = cheerio.load(response.data.html);

      // Debug snippet of full HTML returned (first 200 chars)
      console.log(`[DEBUG] AJAX episode HTML snippet: ${response.data.html.substring(0, 200)}...`);

      let episodeCountOnPage = 0;
      $("a").each((i, elem) => {
        const $elem = $(elem);
        const episodeUrl = $elem.attr("href");
        const episodeTitle = $elem.text().trim();

        if (!episodeUrl) {
          console.log(`[DEBUG] Skipping episode at index ${i} - No href.`);
          return;
        }
        const episodeNumMatch = episodeTitle.match(/\d+/);
        const episodeNum = episodeNumMatch ? parseInt(episodeNumMatch[0]) : null;

        if (!episodeNum) {
          console.log(`[DEBUG] Could not parse episode number from title "${episodeTitle}"`);
          return;
        }

        const episodeId = "asd:" + Buffer.from(episodeUrl).toString("base64");

        episodes.push({
          id: episodeId,
          title: `الحلقة ${episodeNum}`,
          season: null, // will assign season number later in main flow
          episode: episodeNum,
          released: new Date().toISOString(),
        });

        episodeCountOnPage++;
      });

      console.log(`[DEBUG] Episodes parsed on current page: ${episodeCountOnPage}`);

      hasMore = response.data.hasmore === true || response.data.hasmore === "true";
      if (hasMore) {
        offset += 20; // increment offset for next pagination page
      }
    } catch (error) {
      console.error(`[ERROR] AJAX episodes fetch failed for season ${seasonId} at offset ${offset}:`, error.message);
      hasMore = false;
    }
  }

  console.log(`[DEBUG] Total episodes fetched for season ${seasonId}: ${episodes.length}`);
  return episodes;
}

async function getSeriesMeta(id) {
  try {
    const seriesUrl = Buffer.from(id.replace("asd:", ""), "base64").toString();
    console.log(`[DEBUG] Fetching Series Meta URL: ${seriesUrl}`);

    const response = await axios.get(seriesUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const title = $(".post__title h1").text().trim();

    // Extract poster correctly for background and poster
    const posterUrl = $(".poster__single img").attr("src") || $(".poster__single img").attr("data-src");

    const description = $(".story__text").text().trim();

    // Extract seasons
    const seasons = [];
    $("#seasons__list ul li").each((i, elem) => {
      const $elem = $(elem);
      const seasonId = $elem.attr("data-term");
      const seasonName = $elem.find("span").text().trim();

      if (seasonId) {
        seasons.push({
          id: seasonId,
          name: seasonName,
          number: i + 1,
        });
      }
    });

    console.log(`[DEBUG] Seasons found: ${seasons.length}`);

    let videos = [];

    if (seasons.length === 0) {
      // Single season or no seasons detected
      console.log("[DEBUG] No seasons found, falling back to initial episodes list");

      $(".episodes__list a, .seasons__list a").each((i, elem) => {
        const $elem = $(elem);
        const episodeUrl = $elem.attr("href");
        const episodeTitle = $elem.text().trim();

        if (!episodeUrl) return;

        const match = episodeTitle.match(/\d+/);
        const episodeNum = match ? parseInt(match[0]) : i + 1;
        const episodeId = "asd:" + Buffer.from(episodeUrl).toString("base64");

        videos.push({
          id: episodeId,
          title: `الحلقة ${episodeNum}`,
          season: 1,
          episode: episodeNum,
          released: new Date().toISOString(),
        });
      });

      // Check for load more button data-id for more episodes
      const loadMoreButton = $(".load__more__episodes");
      if (loadMoreButton.length) {
        const postId = loadMoreButton.attr("data-id");
        if (postId) {
          console.log(`[DEBUG] Load more episodes button found with postId: ${postId}`);
          const moreEpisodes = await fetchAllEpisodesForSeason(postId);
          moreEpisodes.forEach(ep => {
            ep.season = 1; // Assign season 1
          });
          videos = [...videos, ...moreEpisodes];
        }
      }
    } else {
      // Multi-season scenario
      for (const season of seasons) {
        console.log(`[DEBUG] Fetching episodes for season: ${season.name}, ID: ${season.id}`);
        const episodes = await fetchAllEpisodesForSeason(season.id);
        episodes.forEach(ep => ep.season = season.number);
        videos = [...videos, ...episodes];
      }
    }

    // Deduplicate episodes by ID
    const uniqueVideos = Array.from(new Map(videos.map(v => [v.id, v])).values());

    // Sort episodes by season then episode number ascending
    uniqueVideos.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

    console.log(`[DEBUG] Total unique episodes found: ${uniqueVideos.length}`);

    return {
      id,
      type: "series",
      name: title,
      background: posterUrl || undefined,
      description,
      videos: uniqueVideos,
    };
  } catch (error) {
    console.error(`[ERROR] Failed to get series meta for ID ${id}:`, error.message);
    return { meta: {} };
  }
}

module.exports = { getSeriesMeta, fetchAllEpisodesForSeason };
