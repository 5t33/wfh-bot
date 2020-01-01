require('env-yaml').config({path: __dirname + '/../serverless.env-test.yml'});
const chaiAsPromised = require('chai-as-promised');
const chai = require('chai');
const get = require('lodash/get');
const wfhListenerHandler = require('../../handlers/wfhListener/index').handler;
const dailyWFHMessageHandler = require('../../handlers/postDailyWFHMessage/index').handler;
const wfhController = require('../../handlers/wfhListener/controller');
const slack = require('../../opt/slack');
const { setUpTablesAndCalendar, deleteTables } = require('../test-helper');

chai.use(chaiAsPromised);

const { expect } = chai;

const testUserId = process.env.SLACK_USER_ID;
const slackWFHChannel = process.env.SLACK_WFH_CHANNEL;
const slackBotUserId = process.env.WFH_BOT_SLACK_ID;
// const message = 'Where are you today?\n WFH / Remote :house: \n At the Office :office: \n OOO :face_with_thermometer:'
const message = 'Where are you today?\n WFH / Remote :house: \n At the Office :office:'
// TODO:
// Messed up in making these not call the serverless-offline functions by url.
// Not using the endpoints, or at least invoking by calling the lambda "invoke"
// function is not a true integration test. Need to revert to that. Shouldn't 
// be too big of a lift, but very important.


describe('Daily Message Handler', () => {
  before(async () => {
    try{
      await setUpTablesAndCalendar();
    } catch(err){
      console.log(err)
    }
  })
  after(async () => {
    try{
      await deleteTables();
    } catch(err) {
    }
  })

  it('responds corrects to challenge request', async () => {
    let event = {
      "token": "Jhj5dZrVaK7ZwHHjRyZWjbDl",
      "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
      "type": "url_verification"
  }
    let response = await wfhListenerHandler({
      body: JSON.stringify(event)
    });
    let responseBody = JSON.parse(response.body);

    expect(responseBody.challenge).to.equal(event.challenge);
  })

  it('Stores daily message timestamp/channel in dynamodb', async () => {
    let res = await dailyWFHMessageHandler();
    expect(res.body).to.not.be.undefined;
    let body = JSON.parse(res.body);
    expect(res.statusCode).to.equal(200);
    expect(body.channel).to.equal(slackWFHChannel);
    expect(body.message).to.equal(message);
    expect(body.user).to.equal(slackBotUserId);

    expect(body.timeStamp).to.exist;

    let item = await wfhController.getMessageByKey(body.user, body.timeStamp);
      
    expect(get(item, 'CHANNEL.S')).to.equal(slackWFHChannel);
    expect(get(item, 'TIMESTAMP.S')).to.equal(body.timeStamp);

  });
});

describe('WFH Listener', async () => {

  before(async () => {
    try{
      await setUpTablesAndCalendar();
    } catch(err){
      console.error(err)
    }
  })
  after(async () => {
    try{
      await deleteTables();
    } catch(err) {
      
    }
  });
  
 
  let slackReactionHouse;
   
  it('Adds event to wfh calendar if message exists in messages table', async () => {
    let messageRes = await dailyWFHMessageHandler();
    expect(messageRes.body).to.not.be.undefined;
    let body = JSON.parse(messageRes.body);
    slackReactionHouse = {
      event: {
        type: "reaction_added",
        user: testUserId,
        item: {
          type: 'message',
          channel: slackWFHChannel,
          ts: body.timeStamp
        },
        reaction: 'house',
        item_user: slackBotUserId,
      }
    };
    let event = {
      body: JSON.stringify(slackReactionHouse)
    }
    await wfhListenerHandler(event);

    let { email } = await slack.getInfoBySlackId(testUserId);
    let hasWFHEventBool = await wfhController.hasWFHEvent({email});
    expect(hasWFHEventBool).to.be.true;
  });

  it('Removes wfh event if exists in calendar', async () => {
    try{
      await wfhController.addToWFHCal(testUserId);
    } catch(err){
      // There might be an event from a previous test. 
      // If not, make one.
    } 
    
    slackReactionHouse.event.type = 'reaction_removed'
    let event = {
      body: JSON.stringify(slackReactionHouse)
    }
    let wfhListenerResult = await wfhListenerHandler(event);
    expect(wfhListenerResult.statusCode).to.equal(200);
    let { email } = await slack.getInfoBySlackId(testUserId);
    let hasWFHEventBool = await wfhController.hasWFHEvent({email});
    expect(hasWFHEventBool).to.be.false;
  });

  it('throws 400 if message does not exist', async () => {
    slackReactionHouse.event.item.ts = '1234567';
    let event = {
      body: JSON.stringify(slackReactionHouse)
    }
    let wfhListenerResponse = await wfhListenerHandler(event);
    expect(wfhListenerResponse.statusCode).to.equal(400);
  });
});
