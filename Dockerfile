# Lightweight Node.js 18 LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy all project code
COPY . .

# Expose web pairing dashboard port
EXPOSE 3000

# Start VIRUZ WhatsApp bot
CMD ["node", "index.js"]
