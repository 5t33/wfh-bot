const controller = require('./controller');
// const messageText = 'Where are you today?\n WFH / Remote :house: \n At the Office :office: \n OOO :face_with_thermometer:'
const messageText = 'Where are you today?\n WFH / Remote :house: \n At the Office :office:'


module.exports.handler = async () => {
  const response = {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json'
    },
    isBase64Encoded: false
  }
  try {
    let res = await controller.postWFHDailyMessage(messageText);
    if(res.ok) {
      let {ts, channel, message} = res
      await controller.postReactionToWFHDailyMessage(ts)
      await controller.putInMessagesTable({ts, channel, itemUser: message.user});

      response.body = JSON.stringify({
        timeStamp: res.ts,
        channel: res.channel,
        message: message.text,
        user: message.user,
      });
    } else {
      response.statusCode = 500;
      response.body = JSON.stringify({
        message: "Internal server error"
      });
      console.error(res)
    }
    
  } catch(err){
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: "Internal server error"
    });
    console.error(err)
  }

  return response;
}