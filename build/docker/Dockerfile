FROM impossible98/node
WORKDIR /src/
RUN set -eux \
    && apt-get update \
    && apt-get install --no-install-recommends \
    --yes \
    build-essential \
    make \
    python
COPY package.json pnpm-lock.yaml Makefile ./
RUN make install
COPY . .
EXPOSE 7010
CMD ["make", "start"]
