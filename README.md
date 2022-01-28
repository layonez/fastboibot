## HOW TO

1. Create new telegram bot with https://telegram.me/BotFather
2. Grab bot token to access the HTTP API
3. Start chat with bot or add bot to group
4. Grab chat id from https://api.telegram.org/bot<your_token>/getUpdates
5. You can have your own schedule for bot - use https://crontab.guru/#0-59_6-23_*__\__ to create one. Default is "Run at every minute from 0 through 59 past every hour from 6 through 23"
6. If you want to crawl Immo24 - go to website, just apply you filters and grab url. **It should be list type, not map**
7. If you want to crawl ebay-kleinanzeigen.de - go to website, apply your filters and check that **/seite:1/** pagination data is in url, if not navigate to second page and it should be there. Change **/seite:2/** to **/seite:1/** and grab that URL
8. Update .env_example with your variables and rename it to .env
9. `docker build -t fast_boi_bot .`
10. `docker run fast_boi_bot` or use cloud setup

## You can deploy the app to any of the cloud services you prefer. Here I will describe how to use [Heroku](https://www.heroku.com/pricing) to run this app free for 7/24:

1.  Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) and [Docker](https://docs.docker.com/get-docker/)
2.  Start the docker engine as it is needed for the following commands.
3.  Login to heroku:

```
heroku login
```

4.  Log in to Container Registry:

```
heroku container:login
```

5.  Create app on Heroku:

```
heroku create
```

> This will give output like: `Creating cool-app-name... done, stack is heroku-18`

6. Build the image and push to Container Registry(Use the app name created from previous step):

```
heroku container:push worker --app cool-app-name
```

7.  Then release the image to your app:

```
heroku container:release worker --app desolate-cove-74871
```

This will build the docker image from Dockerfile and release the app on Heroku. Go to your [dashboard](https://dashboard.heroku.com/apps) to view the app. After entering the app dashboard you can see the logs of running app by clicking `More` -> `View logs` on top right corner.
In the logs, you should see your Telegram chat ID if the app was able to find it.

1. (Optional) Go to `Settings` -> `Config Vars` and add a new config vars.

Also make sure in the Dyno formation widget, worker dyno is `ON` and there is no web dyno running.
Normally Heroku free tier sleeps after 30 minutes of inactivity (Not receiving any web traffic). But this is only valid for web dynos, our app doesn't serve any endpoints therefore we don't need a web dyno, all we need is a background app. Worker dyno is best for this use-case as it doesn't go to sleep. Normally Heroku free tier gives 550 hours of free dyno usage when you register, which means you can not run it 7/24 for whole month. But if you add your credit card information they will increase the free dyno limit to 1000 hours which is more than enough to run an app for entire month.
