# Description

This is a serverless slack bot that can be used by teams to place work from home events on a google calendar via emoji reactions to a daily prompt. 

# Usage

Once the bot is deployed, it will post a message to the specified slack channel every morning at the specified time. To add an event to the designated "work from home" calendar, you can reply to the message with a "house" emoji. Deleting the emoji will also remove the event from the calendar. The event details posted to the calendar will be the slack user's "first_name" parameter with " WFH" appended to it. If the first name is an empty string, the "name" parameter will be used as a backup. Reaction adds/removals to previous day's "work from home" messages will have no effect on the current day's calendar events. 

# Dependencies

- [Docker](https://docs.docker.com/v17.12/install/)
- [node 10.16.3](https://nodejs.org/en/download/)
- [npm^6](https://docs.npmjs.com/about-npm-versions#the-latest-release-of-npm)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)

# Setup 
 
1) Download node dependencies
  - ```npm run install-all-node-modules```  <- A common paradigm of serverless applications is to have separate node_modules in each lambda, as well as in each layer, and your test directory or top level directory for local development. This command installs node_modules in each directory as necessary. 
  
  - ```npm i -g serverless```
  
## Setting up google calendar & authentication

3) Create a google calendar to be accessed by your slack bot. Navigate to the calendar's settings and copy the calendar Id into the serverless.env.yml and serverless.test-env.yml files under WFH_GCAL_ID.

4) Configure google authentication information
  - visit this [link](https://developers.google.com/calendar/quickstart/nodejs) and click "enable google calendar"

  - click "Download Client Configuration"

  - Once you download the credentials.json, copy the Client ID, secret, and projectId/quickstartId into both the serverless.env.yml and serverless.env-test.yml files (an automated script for that part would be hepful)

  - then, run ```npm run generate-google-token``` and go to the link provided. Enter the code from the link into the command prompt.
  
## Setting up the slack bot via Slack App
5) Go to the [slack apps home page](https://api.slack.com/apps) and click "create app"
6) Once your app ha been created, navigate to "bot users" and click "add a bot user" 
7)  Navigate to "OAuth & permissions", scroll down to "scopes" and add the following permissions:
  - reactions:read
  - users:read
  - chat:write:bot
8) Naviagate up to "install app in workspace" to install the app in your workspace, which will give your bot user an API token.
9) copy the "Bot User OAuth Access Token" to your serverless.env.yml & serverless.test-env.yml files.
10) **This takes place after deployment** 
- After deployment you must subscribe your work-from-home listener lambda to reaction events via your slack app. 
- [Head back to your slack app](https://api.slack.com/apps) and navigate to event subscriptions.
- Subscribe to reaction events, and past the url of your work-from-home listener post endpoint in the provided form. This will send a "challenge" post to the lambda, which will respond back with the challenge parameter.

## Setting up Environment Files
- The "create-env-file" will create each environment file for you, and will query slack for your slack bot and slack channel IDs by name, and in the case of your test file it will query for your test user's first name and id as well.
- You should use a different serverless.env file for each environment: local, test, dev, staging, prod.
- The "create-env-file" script will ask you for each variable as necessary, and generate the file at the path specified by the "-p" flag.
- To generate your local development serverless.env file, run ```npm run create-env-file -- -p serverless.env-local.yml```
- Alternatively you can copy the serverless.env.example.yml and manually fill out the variables. If you choose to do this you will need to determine the slack IDs of your slack channel, bot user, and test user, which requires some querying. Slack provides some useful interfaces for this: https://api.slack.com/methods/users.list/test https://api.slack.com/methods/channels.list/test 

## Local development: 

1) local dynamodb: 
  - ```docker run -p 8000:8000 amazon/dynamodb-local```
  - ```npm run generate-tables```
2) Locally running the api:
  - ```sls offline -p serverless.env-local.yml```
3) invoking a function:
  -  ```sls invoke -n {function name} -p serverless.env-local.yml``` <- need to make sure this works and add more local development commands. 


## Run tests
- Generate yout test serverless.env file: ``` npm run create-env-file -- -p serverless.env-test.yml``` (stage should be "LOCAL" which is the default)
- Alternatively, you can copy serverless.env-test.example.yml and manually fill out the variables.
- then run ```npm test```
- If all pass, you're good to proceed to deployment

# Deployment
- Generate your respective dev/staging/prod environment files with ```npm run create-env-file -- -p {filename}```
- deploy dev: ```sls deploy -p serverless.env-dev.yml```
- deploy staging: ```sls deploy -p serverless.env-staging.yml```
- deploy production: ```sls deploy -p serverless.env-prod.yml```


## AWS Roles and permissions for deployment
- If you don't have an AWS account, [set one up](https://aws.amazon.com/)
- Deploying this serverless application requires several permissions, including, but not necessarily limited to:
  - iam:CreateRole
  - iam:GetRole
  - iam:AttachRolePolicy
  - iam:AddRoleToInstanceProfile
  - cloudformation:CreateStack
  - cloudformation:DescribeStacks
  - cloudformation:DescribeStackEvents
  - cloudformation:DescribeStackResource
  - cloudformation:ValidateTemplate
  - cloudformation:UpdateStack
  - cloudformation:ListStacks
  - dynamodb:CreateTable
  - dynamodb:DeleteTable
  - lambda:UpdateFunctionCode
  - lambda:UpdateFunctionConfig
  - lambda:GetFunctionConfiguration
  - lambda:AddPermission
  - s3:DeleteObject
  - s3:GetObject
  - s3:ListBucket
  - s3:PutObject
  
# Testing 

- Before you can test slack integrations, you must
1) have your slack bot set up and 
2) Create a severless.env-test.yml env file in the test directory with a slack user's email, first name, and slack ID.

- Before you can test google calendar integration, you must
1) have your google calendar ID and
2) have your google authentication set up and inserted into the serverless.env-test.yml

## Test Commands
- All tests: ```npm test```  
- Unit tests: ```npm run test-unit```
- AWS controller unit test: ```npm run test-aws```
- Integration tests: ```npm run test-integration```
- Calendar integration tests: ```npm run test-calendar```
- Slack integration tests: ```npm run test-slack```
- Handler integration tests: ```npm run test-handlers```
- Controller integration tests: ```npm run test-controllers```

# Caveats
1) The bot will invite users to work-from-home events based on their slack emails.
2) The google user authenticated for the wfh bot should have write access to the calendar in question
3) All users that could potentially be invited to a work from home event on the work from home calendar should have read access on that calendar as well. 
4) When posting work-from-home events, the bot will use the first name of the user, but if that does not exist it will default to "real_name".

# Current known bugs/issues and necessary improvements

1) Deployment currently adds some files from the top level directory into each lambda. only the handler functions should be deployed to each lambda.
2) Race condition between adding/removing a reaction. Adding a reaction and then deleting it fires off two different instances of the listener lambda. This leaves the potential for the deletion lambda to trigger first, and the addition lambda to be fired second, leaving the event on the calendar.
3) While there is currently some code for adding work-from-home events on a specific date, it is not ready or tested.
4) Requiring the entire AWS-sdk is cumbersome and delays lambda cold starts. The opt layer should only require specific services. Haven't gotten that to work yet. 
6) Many aspects of this should be parameterized. E.g., the message posted, the emoji used for declaring a work from home event, and the time of day that the message should be posted. 
7) The google credentials.json file is contructed from environment variables based on the original file downloaded from the google authentication setup. The variables in this file may drift over time if Google makes any changes to that file.
8) Acceptance tests are badly needed. 




