const schedule = require("node-schedule");
require("dotenv").config();
const crawlImmo = require("./crawlImmo");
const crawlEbay = require("./crawlEbay");

const immoSearchLink = process.env.IMMOBILIENSCOUT24_SEARCH_URL;
const ebaySearchLink = process.env.KLEINANZEIGEN_SEARCH_URL;
const immoScheduleRule = process.env.IMMO_SCHEDULE_RULE;
const ebayScheduleRule = process.env.EBAY_SCHEDULE_RULE;

const token = process.env.TELEGRAM_TOKEN;
const chatId = process.env.CHAT_ID;

console.info(
  `Initializing app with config:
    immo searchLink: ${immoSearchLink}
    immo scheduleRule: ${immoScheduleRule}

    ebay searchLink: ${ebaySearchLink}
    ebay scheduleRule: ${ebayScheduleRule}

    token: ${token} 
    chatId: ${chatId} 
`
);

if (immoSearchLink && immoScheduleRule)
  schedule.scheduleJob(immoScheduleRule, () => {
    crawlImmo(immoSearchLink);
  });
else
  console.info(
    "Immo - Some immo setting are missing, crawler initialization skipped"
  );

if (ebaySearchLink && ebayScheduleRule)
  schedule.scheduleJob(ebayScheduleRule, () => {
    crawlEbay();
  });
else
  console.info(
    "EBAY - Some ebay setting are missing, crawler initialization skipped"
  );
