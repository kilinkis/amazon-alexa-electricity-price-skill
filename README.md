# Electricity Price (Alexa skill)

"Alexa, ask electricity price how much power costs." Reads the current price per kWh for Zealand (DK2, zip 2765 Smørum) from the open [Energi Data Service](https://www.energidataservice.dk) API.

Price = (spot + Radius tariff C for the current hour + Energinet transmission/system tariffs + elafgift + optional provider margin) x 1.25 VAT.

OK's own margin and subscription are not open data. Set `SUPPLIER_MARKUP_DKK` (DKK/kWh excl. VAT, from your OK price sheet) to include it.

## Develop

```bash
pnpm install
pnpm test
pnpm price      # prints the current price and what Alexa would say
```

## Deploy (Vercel)

`api/alexa.ts` serves the same skill as an HTTPS endpoint. It verifies Alexa's request signature and timestamp, and optionally the skill ID.

1. In the [Alexa developer console](https://developer.amazon.com/alexa/console/ask) create a custom skill (English UK, "Start from scratch"), paste `skill-package/interactionModels/custom/en-GB.json` into the JSON editor and save. Copy the **Skill ID**.
2. Deploy:

```bash
pnpm dlx vercel --prod     # run from this folder; set the project root to alexa-electricity-price if prompted
```

3. Then set env vars in the Vercel project (optional: `ALEXA_SKILL_ID`, `SUPPLIER_MARKUP_DKK`, `PRICE_AREA`) and redeploy. In the Alexa console set the endpoint type to **HTTPS**, enter `https://<project>.vercel.app/api/alexa`, and choose "My development endpoint is a sub-domain of a domain that has a wildcard certificate" (Vercel domains qualify). Set `ALEXA_SKILL_ID` to the Skill ID so other skills cannot call it.

Set the Vercel function region close to Copenhagen (e.g. `fra1`) for lower latency.

Other zip codes: change `gridGln` / `gridTariffCode` in `src/prices.ts` (grid company and tariff code from the `DatahubPricelist` dataset).
