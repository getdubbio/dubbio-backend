# syntax=docker/dockerfile:1

FROM node:26-trixie AS base
WORKDIR /app

FROM base AS pnpm
ENV PNPM_VERSION=10.33.0
RUN npm install --global pnpm@${PNPM_VERSION} --no-fund --no-audit

# Local development: all dependencies, runs from source. Compose watch syncs
# src/ into the container and Nest recompiles; package.json changes rebuild it.
FROM pnpm AS development
ENV NODE_ENV=development
RUN chown node:node /app
COPY --chown=node:node package.json pnpm-lock.yaml ./
USER node
RUN pnpm install --frozen-lockfile
COPY --chown=node:node nest-cli.json tsconfig.json tsconfig.build.json ./
COPY --chown=node:node src ./src
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM development AS build
RUN pnpm build

FROM pnpm AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

CMD ["node", "dist/main.js"]
