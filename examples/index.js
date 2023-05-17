const hl7Mllp = require('./../src');
const { Client, Hl7Message, Hl7MessageHandler, Server } = hl7Mllp;

class Hl7MllpMessageHandler extends Hl7MessageHandler {
  constructor(socket, opts) {
    super(socket, opts);
  }

  onMessage(message, callback) {
    console.log(message.toString('\n'));
    callback(Hl7Message.createAcknowledgeMessage(message));
  }
}

const port = 6000;

const server = new Server(Hl7MllpMessageHandler);
server.on('networkError', (e) => {
  console.log('Network error: ', e);
});
server.listen(port);

const client = new Client();
const hl7Message = new Hl7Message(
  `MSH|^~\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|
   PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|`
);
hl7Message.on('acknowledge', (ackMessage) => {
  console.log(ackMessage.toString('\n'));
});

client.addMessage(hl7Message);
client.send('127.0.0.1', port);

setTimeout(() => {
  server.close();
  const statistics = server.getStatistics();
  console.log('Server statistics:', statistics.toString());
}, 3000);
