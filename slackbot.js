const { App } = require("@slack/bolt");
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);
const twilioNumber = process.env.TWILIO_NUMBER;

const channelIds = { goodVibez: process.env.GOOD_VIBEZ, badVibez: process.env.BAD_VIBEZ, botResponse: process.env.BOT_RESPONSE, testBot: process.env.TEST_BOT };

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode:true, // enable the following to use socket mode
  appToken: process.env.APP_TOKEN
});

async function sendMessages(phoneNumbers, jsonData) {
  for (const phoneNumber of phoneNumbers) {
    const message = client.messages.create({
      body: JSON.stringify(jsonData, ["type", "score", "ratio", "keywords", "word", "result_code", "result_msg"], 4),
      from: twilioNumber,
      to: phoneNumber
    });
  }
}

app.message(async ({ message, say }) => {
  console.log(message);
  //console.log(message);
  if(message.channel !== channelIds.badVibez) {
    var axios = require("axios").default;

    var options = {
      method: 'GET',
      url: 'https://twinword-sentiment-analysis.p.rapidapi.com/analyze/',
      params: {text: message.text},
      headers: {
        'x-rapidapi-host': 'twinword-sentiment-analysis.p.rapidapi.com',
        'x-rapidapi-key': process.env.X_RAPIDAPI_KEY
      }
    };

    axios.request(options).then(async function (response) {
          console.log(response.data);

          if(response.data.type === "positive") {
            await app.client.reactions.add({ token: process.env.SLACK_BOT_TOKEN, channel: message.channel, name: "thumbsup", timestamp: message.ts});
            //await say(`<@${message.user}>, thanks for the good vibez!`);
          } else if(response.data.type === "negative") {
            await app.client.reactions.add({ token: process.env.SLACK_BOT_TOKEN, channel: message.channel, name: "thumbsdown", timestamp: message.ts});
            //await say(`<@${message.user}>, watch it with those bad vibez.`);

            if(message.channel == channelIds.goodVibez) {
              await app.client.chat.postMessage({ token: process.env.SLACK_BOT_TOKEN, channel: channelIds.badVibez, text: "From good vibez:\n" + options.params.text});
            }

          } else {
              await app.client.reactions.add({ token: process.env.SLACK_BOT_TOKEN, channel: message.channel, name: "neutral_face", timestamp: message.ts});
             //await say(`<@${message.user}>, those vibez are pretty neutral ngl`);
          }

          await app.client.chat.postMessage({ token: process.env.SLACK_BOT_TOKEN, channel: channelIds.botResponse, text: options.params.text + "\n" + JSON.stringify(response.data, ["type", "score", "ratio", "keywords", "word", "result_code", "result_msg"], 4) });

          /*
          var numbers = ["+13456789012", "+12345678901", "+11234567890"];


          sendMessages(numbers, response.data);
          */
    }).catch(function (error) {
          console.error(error);
    });
  }

});

(async () => {
  const port = 5001
  // Start your app
  await app.start(process.env.PORT || port);
  console.log(`⚡ Slack Bolt app is running on port ${port}!`);
})();
