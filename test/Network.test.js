const { Hl7Message, Tag } = require('./../src/Hl7');
const { Hl7MessageHandler, Server } = require('./../src/Server');
const Client = require('./../src/Client');
const log = require('./../src/log');
const net = require('net');

const chai = require('chai');
const expect = chai.expect;

class PositiveAcknowledgementHl7MessageHandler extends Hl7MessageHandler {
  constructor(socket, opts) {
    super(socket, opts);
  }
  onMessage(message, callback) {
    callback(Hl7Message.createAcknowledgeMessage(message));
  }
}

class ApplicationErrorAcknowledgementHl7MessageHandler extends Hl7MessageHandler {
  constructor(socket, opts) {
    super(socket, opts);
  }
  onMessage(message, callback) {
    callback(Hl7Message.createAcknowledgeMessage(message, { error: 'Error :-(' }));
  }
}

describe('Network', () => {
  before(() => {
    log.setLevel('error');
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

  it('should correctly send an HL7 message and receive a positive acknowledgement', (done) => {
    const expectedMcId = `${Math.floor(Math.random() * 1000000000)}`;
    let ack = false;
    let mcId = undefined;
    let aa = undefined;

    const server = new Server(PositiveAcknowledgementHl7MessageHandler);
    server.on('networkError', (e) => {
      throw e;
    });
    server.listen(2101);

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${expectedMcId}|D|2.2|
       PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|`
    );
    message.on('acknowledge', (m) => {
      ack = true;
      mcId = m.getMessageControlId();
      aa = m.get(new Tag('MSA[0].1'));
    });
    client.addMessage(message);
    client.on('closed', () => {
      expect(ack).to.be.true;
      expect(mcId).to.be.eq(expectedMcId);
      expect(aa).to.be.eq('AA');
      server.close();
      done();
    });
    client.on('networkError', (e) => {
      throw e;
    });
    client.send('127.0.0.1', 2101);
  });

  it('should correctly send an HL7 message and receive an acknowledgement with application error', (done) => {
    const expectedMcId = `${Math.floor(Math.random() * 1000000000)}`;
    let ack = false;
    let mcId = undefined;
    let ae = undefined;

    const server = new Server(ApplicationErrorAcknowledgementHl7MessageHandler);
    server.on('networkError', (e) => {
      throw e;
    });
    server.listen(2102);

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${expectedMcId}|D|2.2|
       PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|`
    );
    message.on('acknowledge', (m) => {
      ack = true;
      mcId = m.getMessageControlId();
      ae = m.get(new Tag('MSA[0].1'));
    });
    client.addMessage(message);
    client.on('closed', () => {
      expect(ack).to.be.true;
      expect(mcId).to.be.eq(expectedMcId);
      expect(ae).to.be.eq('AE');
      server.close();
      done();
    });
    client.on('networkError', (e) => {
      throw e;
    });
    client.send('127.0.0.1', 2102);
  });

  it('should prevent adding a duplicate message to the client', () => {
    const client = new Client();
    const message = new Hl7Message(
      'MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    client.addMessage(message);
    client.addMessage(message);
    expect(client.messages.length).to.be.eq(1);
  });

  it('should emit networkError on the client when the connection is refused', (done) => {
    const client = new Client();
    const message = new Hl7Message(
      'MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    client.addMessage(message);
    client.on('networkError', (err) => {
      expect(err).to.be.instanceof(Error);
      done();
    });
    // Connect to a port with nothing listening — triggers ECONNREFUSED → networkError
    client.send('127.0.0.1', 65535);
  });

  it('should correctly return client and server statistics after sending a message', (done) => {
    const server = new Server(PositiveAcknowledgementHl7MessageHandler);
    server.on('networkError', (e) => {
      throw e;
    });
    server.listen(2103);

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${Math.floor(Math.random() * 1000000000)}|D|2.2|`
    );
    client.addMessage(message);
    client.on('closed', () => {
      const clientStats = client.getStatistics();
      expect(clientStats.getBytesSent()).to.be.gt(0);
      expect(clientStats.getBytesReceived()).to.be.gt(0);
      expect(clientStats.toString()).to.be.a('string');

      const serverStats = server.getStatistics();
      expect(serverStats.getBytesReceived()).to.be.gt(0);
      expect(serverStats.toString()).to.be.a('string');
      server.close();
      done();
    });
    client.on('networkError', (e) => {
      throw e;
    });
    client.send('127.0.0.1', 2103);
  });

  it('should close a server that has not started listening without throwing', () => {
    const server = new Server(PositiveAcknowledgementHl7MessageHandler);
    expect(() => server.close()).to.not.throw();
  });

  it('should emit networkError when server fails to bind to an already used port', (done) => {
    const server1 = new Server(PositiveAcknowledgementHl7MessageHandler);
    server1.listen(2104);

    const server2 = new Server(PositiveAcknowledgementHl7MessageHandler);
    server2.on('networkError', (err) => {
      expect(err).to.be.instanceof(Error);
      server1.close();
      server2.close();
      done();
    });

    setTimeout(() => {
      server2.listen(2104);
    }, 50);
  });

  it('should send and receive messages with logMessages option enabled', (done) => {
    const server = new Server(PositiveAcknowledgementHl7MessageHandler);
    server.on('networkError', (e) => {
      throw e;
    });
    server.listen(2105, { logMessages: true });

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${Math.floor(Math.random() * 1000000000)}|D|2.2|`
    );
    client.addMessage(message);
    client.on('closed', () => {
      server.close();
      done();
    });
    client.on('networkError', (e) => {
      throw e;
    });
    client.send('127.0.0.1', 2105, { logMessages: true });
  });

  it('should use the default Hl7MessageHandler onMessage which sends an error acknowledgement', (done) => {
    const server = new Server(Hl7MessageHandler);
    server.on('networkError', (e) => {
      throw e;
    });
    server.listen(2106);

    const client = new Client();
    const message = new Hl7Message(
      `MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${Math.floor(Math.random() * 1000000000)}|D|2.2|`
    );
    let aeReceived = false;
    message.on('acknowledge', (m) => {
      aeReceived = m.get(new Tag('MSA.1')) === 'AE';
    });
    client.addMessage(message);
    client.on('closed', () => {
      expect(aeReceived).to.be.true;
      server.close();
      done();
    });
    client.on('networkError', (e) => {
      throw e;
    });
    client.send('127.0.0.1', 2106);
  });

  it('should emit networkError when the socket connection times out', (done) => {
    // A server that accepts connections but never sends data — the client times out waiting for an ack
    let serverSocket;
    const silentServer = net.createServer((socket) => {
      serverSocket = socket;
    });
    silentServer.listen(2107, () => {
      const client = new Client();
      const message = new Hl7Message(
        `MSH|^~\\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|${Math.floor(Math.random() * 1000000000)}|D|2.2|`
      );
      client.addMessage(message);
      client.on('networkError', (err) => {
        expect(err).to.be.instanceof(Error);
        // Destroy the accepted socket so the server can close cleanly; otherwise
        // the open connection keeps the Node.js event loop alive after mocha finishes.
        if (serverSocket) serverSocket.destroy();
        silentServer.close(() => done());
      });
      client.send('127.0.0.1', 2107, { connectTimeout: 100 });
    });
  });
});
