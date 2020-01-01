const axios = require('axios');
const get = require('lodash.get');
const has = require('lodash.has');
const find = require('lodash.find');
const slackAPIURL = 'https://slack.com/api';
const token = process.env.SLACK_BOT_API_TOKEN
 
const getInfoByEmail = async email => {
  let emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
  if(!typeof email === 'string' || !emailRegex.test(email)) {
    console.error(JSON.stringify({
      msg: 'Invalid value input into getSlackByEmail function',
      email
    }))
  }
  try {
    let res = await axios.get(`${slackAPIURL}/users.list?token=${token}`)
    if(res.status === 200 && !has(res,'data.error') && has(res,'data.members')) {
      let member = find(res.data.members, member => {
        return get(member, 'profile.email') === email;
      });
      if(member) {
        return member;
      }
    } else if(has(res,'data.error')) {
      throw new Error(get(res, 'data.error'));
    }
  } catch(err) {
    console.error(err)
    throw new Error(err);
  }

}

const getInfoBySlackId = async slackId => {
  try{
    let res = await axios.get(`${slackAPIURL}/users.info?token=${token}&user=${slackId}`)
    if(res.status === 200 && !has(res, 'data.error') && get(res, 'data.ok')) {
      if(get(res, 'data.user.profile')) {
        let profile = res.data.user.profile;
        return profile
      } else {
        console.error(`slack user Info response for ${slackId} has no email`)
        console.error(json.stringify(res, null, 2));
        return;
      }

    } else {
      console.error(res)
      throw new Error(res);
    }
  } catch(err) {
    console.error(err)
    throw new Error(err);
  }
}

const getSlackBotIdByName = async slackBotName => {
  try {
    let res = await axios.get(`${slackAPIURL}/users.list?token=${token}`)
    if(res.status === 200 && !has(res, 'data.error') && has(res,'data.members')) {
      let member = find(res.data.members, member => {
        return get(member, 'profile.real_name') === slackBotName;
      });
      if(has(member, 'id')) {
        return get(member, 'id');
      }
    }
  } catch(err) {
    throw new Error(err);
  }
}

const getChannelIdByName = async channelName => {
  try {
    let res = await axios.get(`${slackAPIURL}/channels.list?token=${token}`)
    if(res.status === 200 && !has(res, 'data.error') && has(res,'data.channels')) {
      let channel = find(res.data.channels, channel => {
        return get(channel, 'name') === channelName;
      });
      if(has(channel, 'id')) {
        return get(channel, 'id');
      }
    }
  } catch(err) {
    console.error(err)
    throw new Error(err);
  }
}

const postMessage = async (channel, msg, asUser) => {
  let url = `${slackAPIURL}/chat.postMessage?token=${token}&channel=${channel}&text=${msg}`;
    
  if(asUser) {
    url = url + `&as_user=${asUser}`
  }
  try {
    
    let res = await axios.get(url)
    if(res.status === 200 && res.data) {
      return res.data;
    } else {
      throw new Error(res);
    }
  } catch(err) {
    console.error(err)
    throw new Error(err);
  }
 
}

const postReaction = async (channel, ts, emoji) => {
  let url = `${slackAPIURL}/reactions.add?token=${token}&name=${emoji}&channel=${channel}&timestamp=${ts}`;
    
  try {
    
    let res = await axios.get(url)
    if(res.status === 200 && res.data) {
      console.error(`${emoji} Reaction made`, res.data)
      return res.data;
    } else {
      throw new Error(res);
    }
  } catch(err) {
    console.error(err)
    throw new Error(err);
  }
 
}

module.exports = {
  getInfoBySlackId,
  postMessage,
  getInfoByEmail,
  getSlackBotIdByName,
  getChannelIdByName,
  postReaction
}