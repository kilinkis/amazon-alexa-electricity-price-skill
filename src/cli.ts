import { configFromEnv, currentPrice, speak } from "./prices.js";

const cfg = configFromEnv();
const b = await currentPrice(new Date(), cfg);
console.log(b);
console.log(speak(b, cfg.supplierMarkup > 0));
