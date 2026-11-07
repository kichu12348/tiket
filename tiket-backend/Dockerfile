# Install deps and compile standalone binary
FROM oven/bun:1-debian AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .

# Compiles src/index.ts + all packages into a single executable named "server"
RUN bun build --compile --minify --sourcemap ./src/index.ts --outfile server

#Tiny Google Distroless runtime
FROM gcr.io/distroless/base-debian12:nonroot
WORKDIR /app

COPY --from=builder /app/server ./server

ENV NODE_ENV=production
EXPOSE 3000

ENTRYPOINT ["./server"]