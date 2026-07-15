FROM node:22-bookworm-slim

WORKDIR /app
COPY app ./

ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "--import", "tsx", "server.ts"]
