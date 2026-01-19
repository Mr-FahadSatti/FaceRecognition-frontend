FROM node:latest

# Set environment variable (optional)
ENV REACT_APP_SERVER_URL='http://127.0.0.1:8000'

# Create app directory
WORKDIR /app

# Copy package.json & package-lock.json first (better for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port (React usually runs on 3000)
EXPOSE 3000

# Run the app
CMD ["npm", "start"]
