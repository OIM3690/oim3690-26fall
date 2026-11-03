export default {
  async fetch(request) {
    const symbol = new URL(request.url).searchParams.get("symbol");
    const key = process.env.FINNHUB_API_KEY;
    const url = "https://finnhub.io/api/v1/quote"
      + `?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    return Response.json(data, { status: response.status });
  },
};