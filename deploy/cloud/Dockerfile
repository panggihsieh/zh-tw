FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server ./server
USER node
ENV NODE_ENV=production
CMD ["node", "server/cloud-run.mjs"]
