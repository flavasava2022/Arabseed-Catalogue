const axios = require("axios");
const cheerio = require("cheerio");
const Buffer = require("buffer").Buffer;

const BASE_URL = "https://a.asd.homes";
const SERIES_CATEGORY = "/category/arabic-series-6/";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

async function getSeries(skip = 0) {
  try {
    const page = skip > 0 ? Math.floor(skip / 20) + 1 : 1;
    const url =
      page > 1
        ? `${BASE_URL}${SERIES_CATEGORY}page/${page}/`
        : `${BASE_URL}${SERIES_CATEGORY}`;

    const response = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const series = [];
    $(".movie__block").each((i, elem) => {
      const $elem = $(elem);

      const seriesUrl = $elem.attr("href");
      const title = $elem.find(".post__info h3").text().trim();
      const posterUrl =
        $elem.find(".post__image img").attr("data-src") ||
        $elem.find(".post__image img").attr("src");
      const description = $elem.find(".post__info p").text().trim();

      if (!seriesUrl || !title) {
        return;
      }
      const validPoster =
        posterUrl && posterUrl.startsWith("http") ? posterUrl : undefined;
      const id = "asd:" + Buffer.from(seriesUrl).toString("base64");

      series.push({
        id: id,
        type: "series",
        name: title,
        poster: validPoster,
        posterShape: "poster",
        description: description || `مسلسل ${title}`,
      });
    });

    console.log(`[DEBUG] Total series parsed: ${series.length}`);
    return series;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch series catalog:`, error);
    return [];
  }
}

async function getSeriesMeta(id) {
  try {
    const seriesUrl = Buffer.from(id.replace("asd:", ""), "base64").toString();
    console.log(`[DEBUG] Fetching series meta from URL: ${seriesUrl}`);

    const response = await axios.get(seriesUrl, {
      headers: { "User-Agent": USER_AGENT },
      timeout: 10000,
    });
    console.log(`[DEBUG] Meta page response status: ${response.status}`);

    const $ = cheerio.load(response.data);
    const title = $(".post__title h1").text().trim();
    const posterUrl =
      $(".poster__single img")?.attr("src") ||
      $(".poster__single img")?.attr("href") ||
      $(".poster__single img")?.attr("data-src");

    const description = $(".story__text").text().trim();
    const videos = [];

    $(".episodes__list a, .seasons__list a").each((i, elem) => {
      const $elem = $(elem);
      const episodeUrl = $elem.attr("href");
      const episodeTitle = $elem.text().trim();

      if (!episodeUrl) {
        console.log(
          `[DEBUG] Skipping episode at index ${i} due to missing href`
        );
        return;
      }

      const match = episodeTitle.match(/\d+/);
      const episodeNum = match ? parseInt(match[0]) : i + 1;

      const episodeId = `asd:${Buffer.from(episodeUrl).toString("base64")}`;

      console.log(
        `[DEBUG] Parsed episode ${episodeNum} - ID: ${episodeId}, title: "${episodeTitle}"`
      );

      videos.push({
        id: episodeId,
        title: `الحلقة ${episodeNum}`,
        season: 1,
        episode: episodeNum,
        released: new Date().toISOString(),
      });
    });



    console.log(`[DEBUG] Series meta - title: "${title}", poster: "${posterUrl}"`);
    return {
      id,
      type: "series",
      name: title,
      background: posterUrl||undefined,
      description:
      description,
      videos,
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
      headers: { "User-Agent": USER_AGENT },
    });

    console.log(`[DEBUG] Series streams page status: ${response.status}`);

    const $ = cheerio.load(response.data);

    const streams = [];
    $("iframe").each((i, elem) => {
      const src = $(elem).attr("src");
      if (src) {
        console.log(`[DEBUG] Found stream iframe src: ${src}`);
        streams.push({
          name: "ArabSeed",
          title: `خادم ${i + 1}`,
          url: src,
        });
      }
    });

    console.log(`[DEBUG] Total streams found: ${streams.length}`);

    return streams;
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch series streams for ID ${id}:`,
      error
    );
    return [];
  }
}

module.exports = { getSeries, getSeriesMeta, getSeriesStreams };
