# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:26.10.0-trixie-slim

FROM ${NODE_IMAGE} AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM ${NODE_IMAGE}

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    RYTHM4_DATA=/data

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir /data && chown node:node /data
VOLUME /data

USER node

CMD ["node", "src/entrypoint.ts"]
