const { Hl7Message } = require('./Hl7');
const Network = require('./Network');
const Statistics = require('./Statistics');
const log = require('./log');

const AsyncEventEmitter = require('async-eventemitter');
const net = require('net');

//#region Hl7MessageHandler
class Hl7MessageHandler extends Network {
  /**
   * Creates an instance of Hl7MessageHandler.
   * @constructor
   * @param {Socket} socket - Network socket.
   * @param {Object} [opts] - Network options.
   * @param {number} [opts.connectTimeout] - Connection timeout in milliseconds.
   * @param {boolean} [opts.logMessages] - Log messages.
   */
  constructor(socket, opts) {
    super(socket, opts);

    this.on('message', (message, callback) => {
      this.onMessage(message, callback);
    });
  }

  /**
   * Message received.
   * @method
   * @param {Hl7Message} message - HL7 message object.
   * @param {function(Hl7Message)} callback - Message acknowledge callback function.
   */
  onMessage(message, callback) {
    const error = 'onMessage method must be implemented';
    log.error(error);
    callback(Hl7Message.createAcknowledgeMessage(message, { error }));
  }
}
//#endregion

//#region Server
class Server extends AsyncEventEmitter {
  /**
   * Creates an instance of Server.
   * @constructor
   * @param {Hl7MessageHandler} handlerClass - The handling class to receive incoming HL7 messages.
   */
  constructor(handlerClass) {
    super();
    this.handler = { class: handlerClass };
    this.server = undefined;
    this.clients = [];
    this.statistics = new Statistics();
  }

  /**
   * Listens for incoming connections.
   * @method
   * @param {number} port - Remote port.
   * @param {Object} [opts] - Network options.
   * @param {number} [opts.connectTimeout] - Connection timeout in milliseconds.
   * @param {boolean} [opts.logMessages] - Log messages.
   */
  listen(port, opts) {
    opts = opts || {};

    // Initialize network
    this.server = net.createServer((socket) => {
      log.info(`Client connecting from ${socket.remoteAddress}:${socket.remotePort}`);
      const client = new this.handler.class(socket, opts);
      client.connected = true;
      client.on('close', () => {
        this.statistics.addFromOtherStatistics(client.getStatistics());
      });
      client.on('networkError', (err) => {
        socket.end();
        this.emit('networkError', err);
      });
      this.clients.push(client);

      this.clients = this.clients.filter((item) => item.connected);
    });
    this.server.on('listening', () => {
      log.info(`MLLP server listening on port ${port}`);
    });
    this.server.on('error', (err) => {
      const error = `Server error: ${err.message}`;
      log.error(error);
      this.emit('networkError', err);
    });
    this.server.listen(port);
  }

  /**
   * Gets network statistics.
   * @method
   * @returns {Statistics} Network statistics.
   */
  getStatistics() {
    return this.statistics;
  }

  /**
   * Closes the server.
   * @method
   */
  close() {
    if (this.server && this.server.listening) {
      this.server.close();
    }

    // Close all live sockets
    this.clients.forEach((client) => client.socket.destroy());
    this.clients = [];
  }
}
//#endregion

//#region Exports
module.exports = { Server, Hl7MessageHandler };
//#endregion
