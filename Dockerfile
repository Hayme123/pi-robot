# syntax=docker/dockerfile:1.7
FROM node:24-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && apt-get update && apt-get install -y --no-install-recommends unzip zip chromium \
  && rm -rf /var/lib/apt/lists/*

COPY tsconfig.json ./
COPY src ./src
COPY scaffolds/frontend-scaffold.zip ./scaffolds/frontend-scaffold.zip
RUN --mount=type=secret,id=npm_token mkdir -p /opt/angular-deps \
  && unzip -p ./scaffolds/frontend-scaffold.zip ai-coded-main/package.json > /opt/angular-deps/package.json \
  && unzip -p ./scaffolds/frontend-scaffold.zip ai-coded-main/package-lock.json > /opt/angular-deps/package-lock.json \
  && unzip -p ./scaffolds/frontend-scaffold.zip ai-coded-main/.npmrc > /opt/angular-deps/.npmrc \
  && cd /opt/angular-deps \
  && export NPM_TOKEN="$(cat /run/secrets/npm_token)" \
  && npm ci --include=dev --no-audit --no-fund \
  && test -x node_modules/.bin/ng \
  && rm .npmrc
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    CHROME_BIN=/usr/bin/chromium \
    HOST=0.0.0.0 \
    PORT=3000 \
    PROJECTS_ROOT=/workspace/projects \
    ANGULAR_NODE_MODULES=/opt/angular-deps/node_modules

EXPOSE 3000
CMD ["npm", "start"]
