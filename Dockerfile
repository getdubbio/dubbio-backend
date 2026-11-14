# syntax=docker/dockerfile:1

FROM node:26-trixie AS base
ENV PNPM_VERSION=10.33.0
# Keep the store outside /app so the source bind mount cannot hide it.
ENV npm_config_store_dir=/pnpm-store
RUN npm install --global pnpm@${PNPM_VERSION} --no-fund --no-audit \
  && mkdir -p /pnpm-store \
  && chown node:node /pnpm-store
WORKDIR /app

FROM base AS development
ENV NODE_ENV=development
RUN chown node:node /app
COPY --chown=node:node package.json pnpm-lock.yaml ./
USER node
RUN pnpm install --frozen-lockfile
EXPOSE 3000
CMD ["pnpm", "start:dev"]

FROM development AS build
COPY --chown=node:node nest-cli.json tsconfig.json tsconfig.build.json ./
COPY --chown=node:node src ./src
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:26-trixie AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node drizzle ./drizzle

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
