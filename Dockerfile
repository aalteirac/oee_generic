# Use the smallest official Node.js image
FROM node:slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build

# Use a minimal runtime image
FROM node:slim

WORKDIR /app
COPY --from=builder /app .
EXPOSE 8080
CMD ["node", "server.js"]
