FROM node:18-bullseye-slim

# Install Python and C/C++ compilers for local execution fallbacks
RUN apt-get update && apt-get install -y \
    python3 \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
