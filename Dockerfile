FROM ubuntu:20.04

# Install Ffmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg tini libssl-dev ca-certificates git && \
    rm -rf /var/lib/apt/lists/*

# Install Python
RUN apt-get update && apt-get install -y python3.9 python3.9-dev

# Install Node.js
RUN curl --silent --location https://deb.nodesource.com/setup_4.x |  bash -
RUN apt-get install -y apt-transport-https --yes node
RUN apt-get install --yes build-essential
COPY . /var/www/


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