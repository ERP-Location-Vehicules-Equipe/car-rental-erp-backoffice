
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8001

# En container on utilise le mode start (pas nodemon)
CMD ["npm", "start"]
