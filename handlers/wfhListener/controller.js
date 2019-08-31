"use strict";
const path = require('path');
const layerPath = process.env.STAGE === 'local' ? `${process.cwd()}` + '/opt' : '/opt';
console.log(layerPath)
const AWSController = require(path.join(layerPath,'/aws/controller'));
const { listEvents, addToCal, removeFromCal } = require(path.join(layerPath, './google/calendar'));
const { getInfoBySlackId } = require(path.join(layerPath,'/slack'));
const { dynamodbConfig } = require('./awsConfig');
const {
  getStartAndEndOfDateDate,
  getStartAndEndOfTodayDate,
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

const wfhMessageExists = async (itemUser, timestamp, channel) => {
  let req = {
    TableName: messagesTable,
    Key: {
      TIMESTAMP: {S: timestamp},
      ITEM_USER: {S: itemUser}
    }
  }
  return !!(await awsController.dynamodb.getItem(req));
}

const addToWFHCal = async (slackId, date) => {

  const { start, end } = date ? getStartAndEndOfDateDate(date) : getStartAndEndOfTodayDate()
  
  const { email, first_name } = await getInfoBySlackId(slackId);  
  const summary = first_name + ' WFH';
  const attendees = [{email}];
  //Might need to also check gcal for events created by non-wfh gcal user to keep table consistent w/ calendar
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
    console.error(err);
    throw new Error(err);
  }
}


const getMessageByKey = async (timeStamp, itemUser) => {
  return await awsController.dynamodb.getItem({
    TableName: messagesTable,
    Key: {
      TIMESTAMP: { S: timeStamp },
      ITEM_USER: { S: itemUser }
    }
  });
}

module.exports = {
  addToWFHCal,
  removeFromWFHCal,
  getMessageByKey,
  wfhMessageExists,
  hasWFHEvent
}