# Puppeteer Scraper + Flask Host

A multi-stage Docker build that scrapes a URL with Node.js + Puppeteer + Chromium, then serves the result as JSON from a slim Python/Flask image.

## How it works

| Stage | Base image | Job |
|-------|-----------|-----|
| `scraper` | `node:18-slim` | Installs Chromium via apt, installs Puppeteer (bundled Chromium download skipped), runs `scrape.js`, writes `scraped_data.json` |
| `runtime` | `python:3.10-slim` | Copies only `scraped_data.json` and `server.py`, installs Flask, serves the JSON on port 5000 |

Node, Puppeteer and Chromium are **not** in the final image, so it stays small.

Because scraping happens during the **build**, the URL is supplied as a build argument.

## Files

- `Dockerfile` – multi-stage build
- `scrape.js` – Puppeteer scraper (URL from `SCRAPE_URL` env var or first CLI argument)
- `package.json` – Node dependencies
- `server.py` – Flask app serving the scraped data
- `requirements.txt` – Python dependencies

## Build

Pass the URL with `--build-arg SCRAPE_URL=...`:

```bash
docker build --build-arg SCRAPE_URL=https://example.com -t scraped-site .
```

If you omit the argument it defaults to `https://example.com`.

> **Re-scraping the same URL:** Docker caches the scrape step. To force a fresh scrape of an unchanged URL, add `--no-cache`:
> ```bash
> docker build --no-cache --build-arg SCRAPE_URL=https://example.com -t scraped-site .
> ```

A failed scrape (bad URL, timeout, etc.) fails the build with an error message.

## Run

```bash
docker run --rm -p 5000:5000 scraped-site
```

To use a different port on your machine, change the left side, e.g. `-p 8080:5000`.

## Access the scraped data

Open <http://localhost:5000/> in a browser, or:

```bash
curl http://localhost:5000/
```

Example response:

```json
{
  "url": "https://example.com",
  "final_url": "https://example.com/",
  "status": 200,
  "scraped_at": "2026-11-09T09:47:00.000Z",
  "title": "Example Domain",
  "first_heading": "Example Domain",
  "meta_description": null,
  "heading_count": 1,
  "link_count": 1
}
```

A health check is available at `/health`.

## Passing the URL (options)

- **Docker build (main method):** `--build-arg SCRAPE_URL=<url>`
- **Environment variable (local, without Docker):** `SCRAPE_URL=<url> node scrape.js`
- **CLI argument (local, without Docker):** `node scrape.js <url>`

## Running locally without Docker

```bash
npm install
SCRAPE_URL=https://example.com node scrape.js   # writes scraped_data.json
pip install -r requirements.txt
python server.py
```

Locally, Puppeteer downloads its own Chromium unless you set `PUPPETEER_EXECUTABLE_PATH` to an installed browser.

## Notes

- Scraped fields: page title, first heading (h1–h3), meta description, heading and link counts, HTTP status, final URL and timestamp. Edit the `page.evaluate` block in `scrape.js` to extract more.
- Chromium runs with `--no-sandbox` because the build runs as root in a container.
- The server runs as a non-root user in the final image.