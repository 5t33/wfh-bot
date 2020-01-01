const moment = require('moment-timezone');

const validateDate = (date) => moment(date, ['DD-MM-YYYY', 'DD/MM/YYY'], true);

const getStartAndEndOfTodayDateTime = () => {
  let start = moment().tz('America/New_York').startOf('Day');
  let end = start.clone().endOf('Day');
  return({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString()
  })
}

const getStartAndEndOfDateDateTime = date => {
  let start = moment(date).tz('America/New_York').startOf('Day')
  let end = start.clone().endOf('Day');
  return({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString()
  })
}

// TODO: Why do these return start and end & the others return startDateTime and endDateTime
const getStartAndEndOfTodayDate = () => {
  let start = moment().tz('America/New_York').startOf('Day')
  let end = start.clone().endOf('Day');
  return({
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  })
}

const getStartAndEndOfDateDate = date => {
  let start = moment(date).tz('America/New_York').startOf('Day')
  let end = start.clone().endOf('Day');
  return({
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  })
}

const slackTimeStampToDate = ts => {
  return moment.unix(ts).format("YYYY-MM-DD");
}

module.exports = {
  moment,
  getStartAndEndOfDateDateTime,
  getStartAndEndOfTodayDateTime,
  getStartAndEndOfTodayDate,
  getStartAndEndOfDateDate,
  validateDate,
  slackTimeStampToDate
}