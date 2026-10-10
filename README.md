# Electricity Price (Alexa skill)

"Alexa, ask electricity price how much power costs." Reads the current price per kWh for Zealand (DK2, zip 2765 Smørum) from the open [Energi Data Service](https://www.energidataservice.dk) API.

Price = (spot + Radius tariff C for the current hour + Energinet transmission/system tariffs + elafgift + optional provider margin) x 1.25 VAT.

OK's own margin and subscription are not open data. Set `SUPPLIER_MARKUP_DKK` (DKK/kWh excl. VAT, from your OK price sheet) to include it.

## Develop

```bash
pnpm install
pnpm test
pnpm price      # prints the current price and what Alexa would say
pnpm build      # dist/index.js + lambda.zip
```

## Deploy

1. Create a Node.js 20 Lambda, upload `lambda.zip`, handler `index.handler`, add the *Alexa Skills Kit* trigger. Optional env: `SUPPLIER_MARKUP_DKK`, `PRICE_AREA` (`DK1` for Jutland/Funen).
2. In the [Alexa developer console](https://developer.amazon.com/alexa/console/ask) create a custom skill (locale English UK), paste `skill-package/interactionModels/custom/en-GB.json` into the JSON editor, set the endpoint to the Lambda ARN, build, and test. Skills in development are usable on your own Echo devices signed in with the same Amazon account.

Other zip codes: change `gridGln` / `gridTariffCode` in `src/prices.ts` (grid company and tariff code from the `DatahubPricelist` dataset).
