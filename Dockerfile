# 1. Use the official node image (node:20-alpine is recommended, lightweight)
FROM node:20-alpine

# 2. Set the working directory
WORKDIR /app

# 3. Copy package.json and lock files (speed up npm ci)
COPY package*.json ./

# 4. Install dependencies (using ci is faster)
RUN npm ci

# 5. Copy all code
COPY . .

# 6. Compile Next.js
RUN npm run build

# 7. Set production environment variables (optional)
ENV NODE_ENV=production

# 8. Open port 3000
EXPOSE 3000

# 9. Start the production server
CMD ["npm", "run", "start"]