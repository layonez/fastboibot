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
    const address =
      appartmentData["resultlist.realEstate"]?.address?.description?.text;
    const warmRent =
      appartmentData["resultlist.realEstate"]?.calculatedTotalRent?.totalRent
        ?.value;
    const size = appartmentData["resultlist.realEstate"].livingSpace;
    const room = appartmentData["resultlist.realEstate"].numberOfRooms;
    const title = appartmentData["resultlist.realEstate"].title;
    const link = `https://www.immobilienscout24.de/expose/${appartmentData["@id"]}`;
    const message = `${title} 🏠 ${room} rooms - ${size} m² 💰 ${warmRent} € warm 💰
🗺 address: ${encodeURI(
      "https://www.google.com/maps/search/?api=1&query=" + address
    )}

🔍 ${link}
    `;

    bot.sendMessage(chatId, message);
  }

  ids[appartmentData["@id"]] = {
    added: new Date(),
    data: appartmentData,
  };
};

const crawl = async (url) => {
  reqCount++;

  let data = {};
  try {
    const rawResponse = await fetch(url, {
      retries: 3,
      retryDelay: 10000,
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    data = await rawResponse.json();

    const appartments =
      data.searchResponseModel["resultlist.resultlist"].resultlistEntries[0]
        .resultlistEntry;

    // wtf IMMOBILIENSCOUT??? why?
    if (Array.isArray(appartments)) {
      appartments.map((appartmentData) => {
        const id = ids[appartmentData["@id"]];
        if (!id) {
          addNewId(appartmentData);
        }
        appartmentsCount++;
      });
    } else if (appartments["@id"]) {
      const id = ids[appartments["@id"]];
      if (!id) {
        addNewId(appartments);
      }

      appartmentsCount++;
    } else {
      console.error(
        "🚨 🚨 🚨 WTF result: 🚨 🚨 🚨",
        JSON.stringify(appartmentData)
      );
      bot.sendMessage(
        chatId,
        `🚨 🚨 🚨 WTF result please check logs 🚨 🚨 🚨 `
      );
    }

    const isLastPage =
      !data.searchResponseModel["resultlist.resultlist"].paging.next?.[
        "@xlink.href"
      ];

    if (isLastPage) {
      console.info(
        `IMMO - Runned with result: reqCount=${reqCount} appartmentsCount=${appartmentsCount}`
      );
      isInitialRun = false;
      appartmentsCount = 0;
      reqCount = 0;
    } else {
      crawl(
        "https://www.immobilienscout24.de" +
          data.searchResponseModel["resultlist.resultlist"].paging.next[
            "@xlink.href"
          ]
      );
    }
  } catch (err) {
    console.error("IMMO - Error processing response:", err, url);
  }
};

module.exports = crawl;
