'use strict';

const fs = require('fs');
const puppeteer = require('puppeteer');

// URL comes from the SCRAPE_URL env var, or the first CLI argument.
const targetUrl = process.env.SCRAPE_URL || process.argv[2];
const outputFile = process.env.OUTPUT_FILE || 'scraped_data.json';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

function fail(message) {
  console.error(`[scraper] ERROR: ${message}`);
  process.exit(1);
}

if (!targetUrl) {
  fail('No URL provided. Set SCRAPE_URL or pass it as the first argument.');
}

try {
  const parsed = new URL(targetUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    fail('URL must start with http:// or https://');
  }
} catch {
  fail(`Invalid URL: ${targetUrl}`);
}

(async () => {
  let browser;
  try {
    console.log(`[scraper] Scraping ${targetUrl}`);

    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    const data = await page.evaluate(() => {
      const text = (el) => (el ? el.textContent.trim() : null);
      const meta = document.querySelector('meta[name="description"]');
      return {
        title: document.title || null,
        first_heading: text(document.querySelector('h1, h2, h3')),
        meta_description: meta ? meta.getAttribute('content') : null,
        heading_count: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        link_count: document.querySelectorAll('a[href]').length,
      };
    });

    const result = {
      url: targetUrl,
      final_url: page.url(),
      status: response ? response.status() : null,
      scraped_at: new Date().toISOString(),
      ...data,
    };

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`[scraper] Saved results to ${outputFile}`);
  } catch (err) {
    fail(err.message);
  } finally {
    if (browser) await browser.close();
  }
})();