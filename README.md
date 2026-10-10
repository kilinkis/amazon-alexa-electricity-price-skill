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

## Deploy (Terraform)

1. In the [Alexa developer console](https://developer.amazon.com/alexa/console/ask) create a custom skill (English UK, "Start from scratch"), paste `skill-package/interactionModels/custom/en-GB.json` into the JSON editor and save. Copy the **Skill ID**.
2. Build and apply (needs AWS credentials):

```bash
pnpm build
cd infra
cp terraform.tfvars.example terraform.tfvars   # set skill_id, optionally supplier_markup_dkk
terraform init && terraform apply
```

3. Paste the `lambda_arn` output into the skill's Endpoint (Default Region), save, build the model, and test. Skills in development work on your own Echo devices signed in with the same Amazon account.

The skill itself (invocation name, model) is not managed by Terraform since there is no official AWS provider for it. Re-run `pnpm build && terraform apply` to ship code changes.

## Deploy (Vercel, alternative to AWS)

`api/alexa.ts` serves the same skill as an HTTPS endpoint. It verifies Alexa's request signature and timestamp, and optionally the skill ID.

```bash
pnpm dlx vercel --prod     # run from this folder; set the project root to alexa-electricity-price if prompted
```

Then set env vars in the Vercel project (optional: `ALEXA_SKILL_ID`, `SUPPLIER_MARKUP_DKK`, `PRICE_AREA`) and redeploy. In the Alexa console set the endpoint type to **HTTPS**, enter `https://<project>.vercel.app/api/alexa`, and choose "My development endpoint is a sub-domain of a domain that has a wildcard certificate" (Vercel domains qualify). Set `ALEXA_SKILL_ID` to the Skill ID so other skills cannot call it.

Set the Vercel function region close to Copenhagen (e.g. `fra1`) for lower latency.

Other zip codes: change `gridGln` / `gridTariffCode` in `src/prices.ts` (grid company and tariff code from the `DatahubPricelist` dataset).
