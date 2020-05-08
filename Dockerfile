FROM node:latest

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# RUN cd node_modules/splunk-sdk/
RUN cd node_modules/splunk-sdk/ && pwd && npm install

# Verify that Splunk SDK is installed
RUN node ./node_modules/splunk-sdk/sdkdo -V
RUN cd ./../../

# Bundle app source
COPY . .

# Expose port 80 to host
EXPOSE 80

# Start Web Server
# CMD [ "npm", "start"]

CMD git config --global user.email "docker@example.com"; git config --global user.name "Docker"; git stash; git pull; npm start


# For Bash:
# npm install && cd node_modules/splunk-sdk/ && npm install && cd ./../../ && node app.js && node node_modules/splunk-sdk/sdkdo runserver

# Build Docker Image from Dockerfile
## docker build https://github.com/splunk/splunk-tableau-wdc.git#master:.
# docker build . -t splunk-tableau-wdc
# docker run -t -i -p 80:80 splunk-tableau-wdc:latest

## PUSH
# docker login -u teamfdse
# docker tag splunk-tableau-wdc teamfdse/splunk-tableau-wdc:latest
# docker push teamfdse/splunk-tableau-wdc

## PULL
# docker pull teamfdse/splunk-tableau-wdc
# docker run -t -i -p 80:80 teamfdse/splunk-tableau-wdc:latest
