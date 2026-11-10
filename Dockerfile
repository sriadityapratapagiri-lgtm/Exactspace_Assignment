#stage 1 Scraper
FROM node:18-slim AS scraper
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
PUPPETEER_SKIP_DOWNLOAD=true \
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium 

RUN apt-get update \
&& apt-get install -y --no-install-recommends \
chromium \
fonts-liberation \
fonts-noto-color-emoji \
ca-certificates \
&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev
COPY scrape.js ./
ARG SCRAPE_URL=https://example.com
ENV SCRAPE_URL=${SCRAPE_URL}
ENV OUTPUT_FILE=/app/scraped_data.json

RUN node scrape.js

#stage 2 Runtime

FROM python:3.10-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
PYTHONUNBUFFERED=1 \
DATA_FILE=/app/scraped_data.json \
PORT=5000

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=scraper /app/scraped_data.json ./scraped_data.json 
COPY server.py ./

RUN useradd --system --no-create-home appuser
USER appuser
EXPOSE 5000
CMD ["python", "server.py"]