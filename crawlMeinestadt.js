require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const getRandomUserAgent = require("./utils/userAgents");
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
    const address = `${appartmentData.city}, ${appartmentData.postcode}, ${appartmentData.street}`;
    const rent = `${appartmentData.price} ${appartmentData.priceAppendix}`;

    const size = appartmentData.livingArea;

    const room = appartmentData.rooms;
    const title = appartmentData.title;
    const link = appartmentData.detailUrl;

    const message = `${title} 🏠 ${room} rooms - ${size} m² 💰 ${rent} 💰
🗺 address: ${encodeURI(
      "https://www.google.com/maps/search/?api=1&query=" + address
    )}

🔍 ${link}
    `;

    bot.sendMessage(chatId, message);
  }

  ids[appartmentData.guid] = {
    added: new Date(),
    data: appartmentData,
  };
};

const getCookie = async () => {
  const userAgent = getRandomUserAgent();

  const manifestReq = await fetch("https://www.meinestadt.de", {
    retries: 3,
    retryDelay: 10000,
    headers: {
      Accept: "*/*",
      Connection: "keep-alive",
      "User-Agent": userAgent,
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US;q=0.5,en;q=0.3",
      "Cache-Control": "max-age=0",
      "Upgrade-Insecure-Requests": "1",
      Referer: "https://google.com",
    },
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
  });

  return [
    manifestReq.headers
      .raw()
      ["set-cookie"].map((c) => c.split(";")[0])
      .join(";"),
    userAgent,
  ];
};

const makeRequest = async (page, cookie, userAgent) =>
  fetch(
    "https://www.meinestadt.de/muenchen/immobilien/wohnungen?service=immoweltAjax",
    {
      headers: {
        accept: "application/json",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded",
        pragma: "no-cache",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-requested-with": "XMLHttpRequest",
        cookie,
        Referer: "https://www.meinestadt.de/muenchen/immobilien/wohnungen",
        "Referrer-Policy": "unsafe-url",
        Accept: "*/*",
        Connection: "keep-alive",
        "User-Agent": userAgent,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US;q=0.5,en;q=0.3",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
      },
      body: `geoid=108&pageSize=20&page=${page}&lat=48.1409&lng=11.569&location=muenchen&esr=2&etype=1&sort=distance&sr=10&bigimage=true&roomi=2&flmi=70&prima=1800&isPriceOnRequest=false&debug=false&userModified=true`,
      method: "POST",
    }
  );

const crawl = async (page = 1, cookie, userAgent) => {
  reqCount++;

  let data = {};
  try {
    if (!cookie) {
      [cookie, userAgent] = await getCookie();
    }

    const rawResponse = await makeRequest(page, cookie, userAgent);

    data = await rawResponse.json();

    const appartments = data.results.items;

    if (Array.isArray(appartments)) {
      appartments.map((appartmentData) => {
        const id = ids[appartmentData.guid];
        if (!id) {
          addNewId(appartmentData);
        }
        appartmentsCount++;
      });
    } else {
      console.error(
        "Meinestadt - 🚨 🚨 🚨 WTF result: 🚨 🚨 🚨",
        JSON.stringify(appartmentData)
      );
      bot.sendMessage(
        chatId,
        `Meinestadt - 🚨 🚨 🚨 WTF result please check logs 🚨 🚨 🚨 `
      );
    }

    const isLastPage = data.results.totalPages === data.results.currentPage;

    if (isLastPage) {
      console.info(
        `Meinestadt - Runned with result: reqCount=${reqCount} appartmentsCount=${appartmentsCount}`
      );
      isInitialRun = false;
      appartmentsCount = 0;
      reqCount = 0;
    } else {
      crawl(data.results.currentPage + 1, cookie, userAgent);
    }
  } catch (err) {
    console.error("Meinestadt - Error processing response:", err);
  }
};

module.exports = crawl;
