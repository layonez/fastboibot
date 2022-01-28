const schedule = require("node-schedule");
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const originalFetch = require("node-fetch");
const fetch = require("fetch-retry")(originalFetch);
const cheerio = require("cheerio");

let isInitialRun = true;
let appartmentsCount = 0;
let reqCount = 0;

const searchLink = process.env.KLEINANZEIGEN_SEARCH_URL;

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token);

const ids = {};

const fetchApartments = async (url) => {
  reqCount++;

  try {
    let fetchResult = await fetch(url || searchLink, {
      retries: 3,
      retryDelay: 10000,
    });

    let fetchResultHTML = await fetchResult.text();
    const $ = cheerio.load(fetchResultHTML);

    if (!url) {
      const pages = $(".pagination-pages")
        ?.text()
        ?.trim()
        ?.split("\n")
        ?.map((page) => page.trim());

      if (pages) {
        pages.shift(1);

        for (const pageNum of pages) {
          await fetchApartments(
            searchLink.replace("seite:1", `seite:${pageNum}`)
          );
        }
      }
    }

    let scrapedApartments = [];

    $(".ad-listitem").each((i, el) => {
      const title = $(el).find(".text-module-begin")?.text()?.trim();
      const link =
        "https://www.ebay-kleinanzeigen.de" +
        $(el).find(".text-module-begin")?.find("a")?.attr("href");
      const description = $(el)
        .find(".aditem-main--middle--description")
        ?.text()
        ?.trim();
      const address = $(el).find(".aditem-main--top--left")?.text()?.trim();

      const additionalData = $(el)
        .find(".text-module-end")
        ?.text()
        ?.trim()
        ?.split("\n")
        ?.map((page) => page.trim());
      const price = $(el).find(".aditem-main--middle--price").text()?.trim();
      scrapedApartments.push({
        title,
        link,
        description,
        price,
        additionalData,
        address,
      });
    });

    const filteredApartments = scrapedApartments.filter(
      (apartment) => apartment.title
    );
    for (const scrapedApartment of filteredApartments) {
      appartmentsCount++;

      if (!ids[scrapedApartment.link]) {
        if (!isInitialRun) {
          const message = `${scrapedApartment.title} 🏠 ${
            scrapedApartment.price
          } 💰 - ${scrapedApartment.additionalData}
        ${scrapedApartment.description}
🗺 address: ${encodeURI(
            "https://www.google.com/maps/search/?api=1&query=" +
              scrapedApartment.address
          )}

🔍 ${scrapedApartment.link}
    `;

          bot.sendMessage(chatId, message);
        }

        ids[scrapedApartment.link] = scrapedApartment;
      }
    }

    if (!url) {
      console.info(
        `EBAY - Runned with result: reqCount=${reqCount} appartmentsCount=${appartmentsCount}`
      );
      isInitialRun = false;
      appartmentsCount = 0;
      reqCount = 0;
    }
  } catch (error) {
    console.error("EBAY - Error processing response:", err, url);
  }
};

module.exports = fetchApartments;
