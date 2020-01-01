'use strict';
const controller = require('./controller');
const get = require('lodash.get');
const houseReaction = 'house';
const reactionAddedEvent = 'reaction_added';
const reactionRemovedEvent = 'reaction_removed';

module.exports.handler = async (event, context) => {
  let response = {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json'
    },
    isBase64Encoded: false
  };
  try {
    const body = JSON.parse(event.body);
    const challenge = get(body, 'challenge');
    const eventType = get(body, 'event.type');
    const correctEventType = 
      (eventType === reactionAddedEvent || eventType === reactionRemovedEvent) 
      && get(body, 'event.item.type') === 'message';

    if(challenge) {
      response.body = JSON.stringify({ challenge });
      return response;
    }
    if(correctEventType) {
      const slackId = get(body, 'event.user');
      const itemUser = get(body, 'event.item_user');
      const timestamp = get(body, 'event.item.ts');
      const reaction = get(body, 'event.reaction');
      const wfhAdded = eventType === reactionAddedEvent && reaction === houseReaction;
      const wfhRemoved = eventType === reactionRemovedEvent && reaction === houseReaction;
      
      const message = await controller.getMessageByKey(itemUser, timestamp);

      if(!message) {
        response.statusCode = 400;
        response.body = JSON.stringify({
          // TODO: These messages are not shown in cloudwatch logs because we do not console.error them
          message: 'Message item is not from WFH slack bot'
        });
        return response;
      }

      const correctDate = await controller.isCorrectDate(message);

      if(!correctDate) {
        response.statusCode = 400;
        response.body = JSON.stringify({
          message: 'Message date is not same as event date'
        });
        return response;
      }

      if(wfhAdded) {
        try {
          await controller.addToWFHCal(slackId);
        } catch(err) {
          response.statusCode = 400
          response.body = JSON.stringify({
            message: 'Failed to add slack user ' + slackId
          });
        }
      } else if(wfhRemoved) {
        try {
          await controller.removeFromWFHCal(slackId);
        } catch(err) {
          response.statusCode = 400
          response.body = JSON.stringify({
            message: 'Failed to remove slack user ' + slackId
          });
        }
      } else {
        response.statusCode = 400;
        response.body = JSON.stringify({
          message: 'Reaction is not a supported WFH event'
        });
      }
      
    } else {
      response.statusCode = 400;
      response.body = JSON.stringify({
        message: 'Unsupported event type'
      });
    }
  } catch(err) { 
    console.error(err); 
    response.statusCode = 500
    response.body = JSON.stringify({
      message: 'Internal server error.'
    });
  } 

  return response;
};
