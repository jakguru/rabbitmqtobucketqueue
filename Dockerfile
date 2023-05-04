FROM node:16-alpine
ENV PORT=6363
ENV LC_ALL=C.UTF-8
ENV NODE_ENV=production
ENV LITE_SECRET=someveryimportantsecret
ENV LITE_PATH="/rmqbqc/"
ENV LITE_ALLOW_INSECURE="false"
WORKDIR /
COPY package*.json ./
RUN NODE_ENV=build && npm ci && NODE_ENV=production
COPY . .
EXPOSE 6363/tcp
CMD ["node", "dist/bin.liteServer.js"]
