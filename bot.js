/*
 * forecast-bot
 */

var geocoderProvider = 'google';
var httpAdapter = 'https';
var geoConfig = {
  apiKey: 'google-api-key',
  formatter: null
};

var Botkit = require('Botkit')
var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, geoConfig);
var ForecastIo = require('forecastio');
var forecastio = new ForecastIo('forecast-api-key');

// Setup Slack Bot
if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: true
});

controller.spawn({
  token: process.env.token
}).startRTM(function(err) {
  if (err) {
    throw new Error(err);
  }
});

controller.hears(['hello', 'hi', 'help'], 'direct_message,direct_mention,mention', function(bot, message) {
  bot.reply(message, 'Hello.');
});

controller.hears(["how's the weather in (.*)", "how's the weather at (.*)", "weather in (.*)", "weather at (.*)"],
  'direct_message, direct_mention, mention',
  function(bot, message) {
    var location = message.match[1];
    geocoder.geocode(location, function(err, res) {
      var result = res.shift()
      var latitude = result['latitude']
      var longitude = result['longitude']
      forecastio.forecast(latitude, longitude).then(function(data) {
        console.log(JSON.stringify(data, null, 2));
        var currently = data['currently']
        var icon = currently['icon']
        var temp = Math.round(currently['temperature'])
        var apparentTemperature = Math.round(currently['apparentTemperature'])

        var nextHour = data['minutely']
        var nextHourIcon = nextHour['icon']
        var currently = "It's currently " + forecastSummary(icon) + " with a temperature of " + temp + "° (_feels like " + apparentTemperature + "°_)."
        var nextHour = "It will be " + forecastSummary(nextHourIcon) + " during the next hour."

        var response = currently + "\n" + nextHour
        return bot.reply(message, response);
      });
    });
  });

// Prettify & interpret Forecast.io data

function forecastSummary(summaryCode) {
  switch(summaryCode) {
    case "clear-day":
      return "sunny"
    case "clear-night":
      return "clear"
    case "rain":
      return "raining"
    case "snow":
      return "snowing"
    case "sleet":
      return "sleeting"
    case "wind":
      return "windy"
    case "fog":
      return "foggy"
    case "cloudy":
      return "cloudy"
    case "partly-cloudy-day":
      return "partly cloudy"
    case "partly-cloudy-night":
      return "partly cloudy"
    default:
      return null
  }
}
