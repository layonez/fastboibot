const schedule = require("node-schedule");
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fetch = require("node-fetch");

let isInitialRun = true;

const searchLink = process.env.IMMOBILIENSCOUT24_SEARCH_URL;
const scheduleRule = process.env.SCHEDULE_RULE;

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

console.info(
  `Initializing app with config:
    searchLink: ${searchLink}
    scheduleRule: ${scheduleRule}
    token: ${token} 
    chatId: ${chatId} 
`
);

const bot = new TelegramBot(token);

bot.sendMessage(
  chatId,
  `🏃🏃🏃 Warming up 🏃🏃🏃
  Initialized with config:
    scheduleRule: ${scheduleRule}
    token: ${token} 
    chatId: ${chatId} 
`
);

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
  const rawResponse = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const data = await rawResponse.json();

  data.searchResponseModel[
    "resultlist.resultlist"
  ].resultlistEntries[0].resultlistEntry.map((appartmentData) => {
    const id = ids[appartmentData["@id"]];
    if (!id) {
      addNewId(appartmentData);
    }
  });

  const isLastPage =
    !data.searchResponseModel["resultlist.resultlist"].paging.next?.[
      "@xlink.href"
    ];

  if (isLastPage) {
    isInitialRun = false;
  } else {
    crawl(
      "https://www.immobilienscout24.de" +
        data.searchResponseModel["resultlist.resultlist"].paging.next[
          "@xlink.href"
        ]
    );
  }
};

console.info(
  `fastboi bot scheduled to run according to crone rule: ${scheduleRule}`
);

const job = schedule.scheduleJob(scheduleRule, function () {
  crawl(searchLink);
});
