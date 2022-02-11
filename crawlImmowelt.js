require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const originalFetch = require("node-fetch");
const fetch = require("fetch-retry")(originalFetch);

let isInitialRun = true;
let appartmentsCount = 0;
let reqCount = 0;

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token);

const ids = {};
const addNewId = (appartmentData) => {
  if (!isInitialRun) {
    const address = `${appartmentData.place.city}, ${appartmentData.place.postcode}, ${appartmentData.place.disctrict} ${appartmentData.place.street} ${appartmentData.place.houseNumber}`;
    const rent = appartmentData.prices
      .map((price) => `${price.type}: ${price.amountMax}€`)
      .join(", ");

    const size = appartmentData.areas
      .map((area) => `${area.type}: ${area.sizeMax}m²`)
      .join(", ");

    const room = appartmentData.roomsMax;
    const title = appartmentData.title;
    const link = `https://www.immowelt.de/expose/${appartmentData.onlineId}`;
    const message = `${title} 🏠 ${room} rooms - ${size} 💰 ${rent} 💰
🗺 address: ${encodeURI(
      "https://www.google.com/maps/search/?api=1&query=" + address
    )}

🔍 ${link}
    `;

    bot.sendMessage(chatId, message);
  }

  ids[appartmentData.onlineId] = {
    added: new Date(),
    data: appartmentData,
  };
};

const getToken = async () => {
  const authReq = await fetch("https://api.immowelt.com/auth/oauth/token", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      authorization:
        "Basic cmVzaWRlbnRpYWwtc2VhcmNoLXVpOlU4KzhzYn4oO1E0YlsyUXcjaHl3TSlDcTc=",
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
      pragma: "no-cache",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      Referer: "https://www.immowelt.de/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: "grant_type=client_credentials",
    method: "POST",
  });

  const data = await authReq.json();

  return data.access_token;
};

const makeRequest = async (page, token) =>
  fetch("https://api.immowelt.com/residentialsearch/v1/searches", {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      authorization: `Bearer ${token}`,
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      Referer: "https://www.immowelt.de/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: `{"estateType":"APARTMENT","distributionTypes":["RENT","LEASE"],"estateSubtypes":[],"locationIds":[531953],"featureFilters":[],"excludedFeatureFilters":[],"primaryPrice":{"min":null,"max":1450},"primaryArea":{"min":70,"max":null},"areas":[{"areaType":"PLOT_AREA","min":null,"max":null}],"rooms":{"min":2.5,"max":null},"constructionYear":{"min":null,"max":null},"geoRadius":{"radius":15,"point":{"lat":48.13546615700005,"lon":11.573193737391229}},"zipCode":null,"sort":{"direction":"DESC","field":"RELEVANCE"},"immoItemTypes":["ESTATE","PROJECT"],"paging":{"size":20,"page":${page}}}`,
    method: "POST",
  });

const crawl = async (page = 1, token) => {
  reqCount++;

  let data = {};
  try {
    if (!token) {
      token = await getToken();
    }

    const rawResponse = await makeRequest(page, token);

    data = await rawResponse.json();

    const appartments = data.data;

    if (Array.isArray(appartments)) {
      appartments.map((appartmentData) => {
        const id = ids[appartmentData.onlineId];
        if (!id) {
          addNewId(appartmentData);
        }
        appartmentsCount++;
      });
    } else {
      console.error(
        "IMMOWELT - 🚨 🚨 🚨 WTF result: 🚨 🚨 🚨",
        JSON.stringify(appartmentData)
      );
      bot.sendMessage(
        chatId,
        `IMMOWELT - 🚨 🚨 🚨 WTF result please check logs 🚨 🚨 🚨 `
      );
    }

    const isLastPage = data.pagesCount === data.selectedPage;

    if (isLastPage) {
      console.info(
        `IMMOWELT - Runned with result: reqCount=${reqCount} appartmentsCount=${appartmentsCount}`
      );
      isInitialRun = false;
      appartmentsCount = 0;
      reqCount = 0;
    } else {
      crawl(data.selectedPage + 1, token);
    }
  } catch (err) {
    console.error("IMMOWELT - Error processing response:", err);
  }
};

module.exports = crawl;
