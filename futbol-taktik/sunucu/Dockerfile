FROM node:20-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app/data
ENV PORT=8080 VERI_KLASORU=/app/data
EXPOSE 8080
VOLUME ["/app/data"]
USER node
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/saglik || exit 1
CMD ["node", "server.js"]
