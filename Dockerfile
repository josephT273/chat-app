FROM oven/bun:1

WORKDIR /app

# install postgres client tools and openssl for secret generation
RUN apt-get update && apt-get install -y postgresql-client openssl

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG BETTER_AUTH_SECRET
RUN if [ -z "$BETTER_AUTH_SECRET" ]; then \
      echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)" >> .env; \
    else \
      echo "BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET" >> .env; \
    fi


EXPOSE 3000

CMD ["bun","run","start"]