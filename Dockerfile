FROM oven/bun:1

WORKDIR /app

# install postgres client tools and openssl for secret generation
RUN apt-get update && apt-get install -y postgresql-client openssl

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["bun","run","start"]