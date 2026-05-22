FROM node:18-slim

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5000
EXPOSE 5000

CMD ["sh", "-c", "node bot.js & gunicorn app:app --bind 0.0.0.0:5000"]

