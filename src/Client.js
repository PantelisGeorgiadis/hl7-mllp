const Network = require('./Network');
const { Hl7Message } = require('./Hl7');
const log = require('./log');

const AsyncEventEmitter = require('async-eventemitter');
const net = require('net');

//#region Client
class Client extends AsyncEventEmitter {
  /**
   * Creates an instance of Client.
   * @constructor
   */
  constructor() {
    super();
    this.messages = [];
  }

  /**
   * Adds an HL7 message.
   * @method
   * @param {Hl7Message} message - HL7 message object.
   * @throws Error if message is not an instance of the Hl7Message class.
   */
  addMessage(message) {
    if (!(message instanceof Hl7Message)) {
      throw new Error(`${message.toString()} is not an instance of Hl7Message`);
    }
    // Prevent duplicates
    if (this.messages.includes(message)) {
      return;
    }
    this.messages.push(message);
  }

  /**
   * Clears all HL7 messages.
   * @method
   */
  clearMessages() {
    this.messages.length = 0;
  }

  /**
   * Sends messages to the remote host.
   * @method
   * @param {string} host - Remote host.
   * @param {number} port - Remote port.
   * @param {Object} [opts] - Network options.
   * @param {number} [opts.connectTimeout] - Connection timeout in milliseconds.
   * @param {boolean} [opts.logMessages] - Log messages.
   * @throws Error if there are no messages to send.
   */
  send(host, port, opts) {
    opts = opts || {};

    // Check for messages
    if (this.messages.length === 0) {
      throw new Error('There are no messages to send');
    }

    // Connect
    log.info(`Connecting to ${host}:${port}`);
    const socket = net.connect({ host, port });

    const network = new Network(socket, opts);
    network.on('connect', () => {
      this.emit('connected');
      network.sendMessages(this.messages);
    });
    network.on('done', () => {
      socket.end();
    });
    network.on('networkError', (err) => {
      socket.end();
      this.emit('networkError', err);
    });
    network.on('close', () => {
      this.emit('closed');
    });
  }
}
//#endregion

//#region Exports
module.exports = Client;
//#endregion
