require('env-yaml').config({path: __dirname + '/../serverless.env-test.yml'});

const { getInfoBySlackId, postMessage, getInfoByEmail, postReaction } = require('../../opt/slack');

const chai = require('chai');
const { expect } = chai;

const testUserId = process.env.SLACK_USER_ID;
const testUserEmail = process.env.SLACK_USER_EMAIL;
const testUserName = process.env.SLACK_USER_FIRST_NAME;
const slackWFHChannel = process.env.SLACK_WFH_CHANNEL;
const slackBotUserId = process.env.WFH_BOT_SLACK_ID;
// const message = 'Where are you today?\n WFH / Remote :house: \n At the Office :office: \n OOO :face_with_thermometer:'
const message = 'Where are you today?\n WFH / Remote :house: \n At the Office :office:'

describe('infoBySlackId integration', () => {
  it('Successfully gets slackId by email', async () => {
    let info = await getInfoByEmail(testUserEmail);
    expect(info).to.exist
    let { id } = info;
    expect(id).to.equal(testUserId);
  });

  it('Responds with correct email address, name', async () => {
    let {email, first_name} = await getInfoBySlackId(testUserId);
    
    expect(email).to.equal(testUserEmail)
    expect(first_name).to.equal(testUserName)

  });

});

describe('postMessage integration', () => {
  it('correctly posts message to channel as user', async () => {
    let res = await postMessage(slackWFHChannel, message,slackBotUserId);
    expect(res.ok).to.be.true
    expect(res.message.text).to.equal(message);
    expect(res.channel).to.equal(slackWFHChannel);
    expect(res.message.user).to.equal(slackBotUserId);
  });
});

describe('postReaction integration', () => {
  it('correctly reacts to message in channel', async () => {
    let res = await postMessage(slackWFHChannel, message,slackBotUserId);
    let {ts} = res
    let res2 = await postReaction(slackWFHChannel, ts, 'house');
    expect(res.ok).to.be.true

  });
});