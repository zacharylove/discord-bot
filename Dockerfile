# Use LTS version of Node 18
FROM node:18

# Install Ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg tini libssl-dev ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

# Create working directory to hold the application code inside the image 
WORKDIR /usr/src/app

@@ -11,7 +16,6 @@ WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install
RUN apt-get update -qq && apt-get install ffmpeg -y

# To bundle your app's source code inside the Docker image, use the COPY instruction
COPY . .