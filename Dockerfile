# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
# RUN bun test
# RUN bun run build

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src src
COPY --from=prerelease /usr/src/app/package.json .

# Define volume for output/memories
VOLUME /usr/src/app/src/output/memories

# Set permissions for the output directory and its parent directories
RUN mkdir -p /usr/src/app/src/output/memories && \
    chown -R bun:bun /usr/src/app/src && \
    chmod -R 755 /usr/src/app/src && \
    chown -R bun:bun /usr/src/app/src/output && \
    chmod -R 755 /usr/src/app/src/output && \
    chown -R bun:bun /usr/src/app/src/output/memories && \
    chmod -R 755 /usr/src/app/src/output/memories

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
