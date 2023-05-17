const { Hl7Message } = require('./../src/Hl7');
const { Hl7MessageHandler, Server } = require('./../src/Server');
const Client = require('./../src/Client');
const log = require('./../src/log');

const chai = require('chai');
const expect = chai.expect;

class TestHl7MessageHandler extends Hl7MessageHandler {
  constructor(socket, opts) {
    super(socket, opts);
  }
  onMessage(message, callback) {
    callback(Hl7Message.createAcknowledgeMessage(message));
  }
}

describe('Network', () => {
  before(() => {
    log.level = 'error';
  });

  it('should throw in case of bad client input', () => {
    expect(() => {
      const client1 = new Client();
      client1.addMessage('this is a message');
    }).to.throw();

    expect(() => {
      const client2 = new Client();
      const message2 = new Hl7Message(
        'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
      );
      client2.addMessage(message2);
      client2.clearMessages();
      client2.send('127.0.0.1', 2100);
    }).to.throw();
  });

  it('should correctly send an HL7 message and receive an acknowledgement', () => {
    const expectedMcId = '1234567890';
    let ack = false;
    let mcId = undefined;

    const server = new Server(TestHl7MessageHandler);
    server.listen(2101);

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${expectedMcId}|D|2.2|
       PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|`
    );
    message.on('acknowledge', (m) => {
      ack = true;
      mcId = m.getMessageControlId();
    });
    client.addMessage(message);
    client.on('closed', () => {
      expect(ack).to.be.true;
      expect(mcId).to.be.eq(expectedMcId);
      server.close();
    });
    client.send('127.0.0.1', 2101);
  });
});
