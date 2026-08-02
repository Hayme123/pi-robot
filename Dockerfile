FROM node:24-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && apt-get update && apt-get install -y --no-install-recommends unzip zip chromium curl \
  && curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$(dpkg --print-architecture)" -o /usr/local/bin/cloudflared \
  && chmod +x /usr/local/bin/cloudflared \
  && rm -rf /var/lib/apt/lists/*

COPY tsconfig.json ./
COPY src ./src
COPY scaffolds/frontend-scaffold.zip ./scaffolds/frontend-scaffold.zip
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    CHROME_BIN=/usr/bin/chromium \
    HOST=0.0.0.0 \
    PORT=3000 \
    PROJECTS_ROOT=/workspace/projects

EXPOSE 3000
CMD ["npm", "start"]
