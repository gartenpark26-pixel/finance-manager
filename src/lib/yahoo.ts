import yahooFinance from "yahoo-finance2";

// Yahoo Finance blocks requests that don't carry a browser-like User-Agent,
// responding with HTTP 429 "Too Many Requests". The yahoo-finance2 default UA
// (`yahoo-finance2/<version> (+<repo>)`) is one of the blocked values, which
// makes every quote/search call fail. Passing these moduleOptions overrides the
// default UA per request (the lib merges `fetchOptions.headers` after its own).
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const yahooModuleOptions = {
  fetchOptions: {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json,text/plain,*/*",
    },
  },
} as const;

// Silence the interactive survey notice (irrelevant on a server).
yahooFinance.suppressNotices(["yahooSurvey"]);

export { yahooFinance };
