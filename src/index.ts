import * as Alexa from "ask-sdk-core";
import { configFromEnv, currentPrice, speak } from "./prices";

const cfg = configFromEnv();

const respondWithPrice = async (h: Alexa.HandlerInput) => {
  try {
    const b = await currentPrice(new Date(), cfg);
    return h.responseBuilder.speak(speak(b, cfg.supplierMarkup > 0)).getResponse();
  } catch (err) {
    console.error(err);
    return h.responseBuilder.speak("Sorry, I could not fetch the electricity price right now.").getResponse();
  }
};

const Launch: Alexa.RequestHandler = {
  canHandle: (h) => Alexa.getRequestType(h.requestEnvelope) === "LaunchRequest",
  handle: respondWithPrice,
};

const GetPrice: Alexa.RequestHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "GetPriceIntent",
  handle: respondWithPrice,
};

const Help: Alexa.RequestHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    Alexa.getIntentName(h.requestEnvelope) === "AMAZON.HelpIntent",
  handle: (h) =>
    h.responseBuilder.speak("Ask me: what does electricity cost right now?").reprompt("What would you like to know?").getResponse(),
};

const Stop: Alexa.RequestHandler = {
  canHandle: (h) =>
    Alexa.getRequestType(h.requestEnvelope) === "IntentRequest" &&
    ["AMAZON.StopIntent", "AMAZON.CancelIntent"].includes(Alexa.getIntentName(h.requestEnvelope)),
  handle: (h) => h.responseBuilder.speak("Goodbye").getResponse(),
};

export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(Launch, GetPrice, Help, Stop)
  .lambda();
