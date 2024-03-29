# Use LTS version of Node 18
FROM node:18

# Install Ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg tini libssl-dev ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

# Create working directory to hold the application code inside the image 
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
# rather than copying the entire working directory, we are only copying the package.json file
COPY package*.json ./

RUN npm install

# To bundle your app's source code inside the Docker image, use the COPY instruction
COPY . .

RUN npm run build

# define the command to run your app using CMD which defines your runtime
# Using -r dotenv/config starts your node app with dotenv preloaded
CMD TS_NODE_BASEURL=./prod node -r dotenv/config -r tsconfig-paths/register ./prod/index.js