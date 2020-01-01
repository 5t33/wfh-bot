"use strict";
const path = require('path');
const layerPath = process.env.LAYER_PATH;
const AWSController = require(path.join(layerPath,'/aws/controller'));
const { listEvents, addToCal, removeFromCal } = require(path.join(layerPath, './google/calendar'));
const { getInfoBySlackId } = require(path.join(layerPath,'/slack'));
const { dynamodbConfig } = require('./awsConfig');
const {
  getStartAndEndOfDateDate,
  getStartAndEndOfTodayDate,
  slackTimeStampToDate
} = require(path.join(layerPath,'/time'));
const awsController = new AWSController({
  dynamodb: dynamodbConfig
});
const messagesTable = process.env.MESSAGES_TABLE;
const gCalIdWFH = process.env.WFH_GCAL_ID;

const hasWFHEvent = async ({email, date}) => {
  let events = await listEvents(gCalIdWFH, date);
  let userEvents = events.filter(event => {
    if(event.attendees) {
      let hasAttendee = event.attendees.some(attendee => {
        return attendee.email == email
      });
      return hasAttendee;
    }

    return false;
  });
  return !(userEvents.length == 0);
}

const addToWFHCal = async (slackId, date) => {
  const { start, end } = date ? getStartAndEndOfDateDate(date) : getStartAndEndOfTodayDate()
  const { email, real_name_normalized } = await getInfoBySlackId(slackId);
  const summary = real_name_normalized + ' WFH';
  const attendees = [{email}];
  let hasEvent = await hasWFHEvent({email, date});
  if(!hasEvent) {
    const res = await addToCal({calendarId: gCalIdWFH, attendees, summary, start, end});
    if(res.status === 'confirmed') {
      console.log(`event created for ${email} with event ID: ${res.id}`)
      return res;
    } else {
      console.error(JSON.stringify({
        statusCode: res.status,
        message: res.message
      }, null, 2))
    }
    throw new Error(res.message);
  } else {

    console.error({
      msg:'WFH event already logged for this user',
      slackId,
      email
    })
    throw new Error('WFH event already logged for this user');
  }

}

const removeFromWFHCal = async (slackId, date) => {
  const { start } = date ? getStartAndEndOfDateDate(date) : getStartAndEndOfTodayDate()

  try {
    const { email } = await getInfoBySlackId(slackId);

    let events = await listEvents(gCalIdWFH, date);
    let userEvents = events.filter(event => {
      if(event.attendees) {
        let hasAttendee = event.attendees.some(attendee => {
          return attendee.email == email
        });
        return hasAttendee;
      }
      return false;
    });
    let removals = await Promise.all(userEvents.map( async event => {
      let eventId = event.id;
      if(eventId) {
        return await removeFromCal({calendarId: gCalIdWFH, eventId});
      }
    }));
    if(removals.every(removal => !!removal)){
      return true;
    } else {
      throw new Error({
        msg: "not all removals were a success",
        data: removals
      })
    }

  } catch(err) {
    throw new Error(err);
  }
}


const getMessageByKey = async (itemUser, timeStamp) => {
  return await awsController.dynamodb.getItem({
    TableName: messagesTable,
    Key: {
      TIMESTAMP: { S: timeStamp },
      ITEM_USER: { S: itemUser }
    }
  });
}

const isCorrectDate = (message, date) => {
  const { start } = date ? getStartAndEndOfDateDate(date) : getStartAndEndOfTodayDate()
  const messageTimeStamp = message['TIMESTAMP'].S;
  const messageDate = slackTimeStampToDate(messageTimeStamp);
  return messageDate === start;
}

module.exports = {
  addToWFHCal,
  removeFromWFHCal,
  getMessageByKey,
  hasWFHEvent,
  isCorrectDate
}
