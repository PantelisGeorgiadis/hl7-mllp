const { Hl7Message } = require('./Hl7');
const Statistics = require('./Statistics');
const log = require('./log');

const AsyncEventEmitter = require('async-eventemitter');

//#region Constants
/**
 * Vertical tab character.
 * @constant {string}
 */
const Vt = String.fromCharCode(0x0b);
Object.freeze(Vt);

/**
 * Field separator character.
 * @constant {string}
 */
const Fs = String.fromCharCode(0x1c);
Object.freeze(Fs);

/**
 * Carriage return character.
 * @constant {string}
 */
const Cr = String.fromCharCode(0x0d);
Object.freeze(Cr);
//#endregion

//#region Network
class Network extends AsyncEventEmitter {
  /**
   * Creates an instance of Network.
   * @constructor
   * @param {Socket} socket - Network socket.
   * @param {Object} [opts] - Network options.
   * @param {number} [opts.connectTimeout] - Connection timeout in milliseconds.
   * @param {boolean} [opts.logMessages] - Log messages.
   */
  constructor(socket, opts) {
    super();
    this.socket = socket;
    this.messages = [];
    this.pending = [];

    opts = opts || {};
    this.connectTimeout = opts.connectTimeout || 3 * 60 * 1000;
    this.logMessages = opts.logMessages || false;
    this.connected = false;
    this.logId = socket.remoteAddress || '';
    this.statistics = new Statistics();

    this.socket.setTimeout(this.connectTimeout);
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connect');
    });
    const messageProcessor = new Hl7MessageProcessor();
    messageProcessor.on('message', (hl7) => {
      this._processMessage(hl7);
    });
    this.socket.on('data', (data) => {
      messageProcessor.process(data);
      this.statistics.addBytesReceived(data.length);
    });
    this.socket.on('error', (err) => {
      this.connected = false;
      const error = `${this.logId} -> Connection error: ${err.message}`;
      log.error(error);
      this.emit('networkError', new Error(error));
    });
    this.socket.on('timeout', () => {
      this.connected = false;
      const error = `${this.logId} -> Connection timeout`;
      log.error(error);
      this.emit('networkError', new Error(error));
    });
    this.socket.on('close', () => {
      this.connected = false;
      log.info(`${this.logId} -> Connection closed`);
      this.emit('close');
    });
  }

  /**
   * Sends HL7 messages.
   * @method
   * @param {Hl7Message|Array<Hl7Message>} messageOrMessages - HL7 message(s) to send.
   */
  sendMessages(messageOrMessages) {
    const msgs = Array.isArray(messageOrMessages) ? messageOrMessages : [messageOrMessages];
    this.messages.push(...msgs);
    this._sendNextMessages();
  }

  /**
   * Gets network statistics.
   * @method
   * @returns {Statistics} Network statistics.
   */
  getStatistics() {
    return this.statistics;
  }

  //#region Private Methods
  /**
   * Sends messages over the network.
   * @method
   * @private
   */
  _sendNextMessages() {
    const processNextMessage = () => {
      const message = this.messages.shift();
      if (!message) {
        this.emit('done');
        return;
      }
      this.pending.push(message);
      message.on('done', () => {
        processNextMessage();
      });
      this._sendMessage(message);
    };
    processNextMessage();
  }

  /**
   * Sends HL7 message.
   * @method
   * @private
   * @param {Hl7Message} message - HL7 message object.
   */
  _sendMessage(message) {
    try {
      log.info(
        `${this.logId} -> Sending message [id: ${message.getMessageControlId()}] ${
          this.logMessages ? message.toString('\n') : ''
        }`
      );

      const data = Vt + message.toString() + Fs + Cr;
      this.socket.write(data);
      this.statistics.addBytesSent(data.length);
    } catch (err) {
      log.error(`${this.logId} -> Error sending HL7 message: ${err.message}`);
      this.emit('networkError', err);
    }
  }

  /**
   * Processes an HL7 message.
   * @method
   * @private
   * @param {string} hl7 - HL7 message.
   */
  _processMessage(hl7) {
    try {
      const message = new Hl7Message(hl7);

      log.info(
        `${this.logId} <- Received message [id: ${message.getMessageControlId()}] ${
          this.logMessages ? message.toString('\n') : ''
        }`
      );

      const messageToAcknowledge = this.pending.find(
        (r) => r.getMessageControlId() === message.getMessageControlId()
      );
      if (messageToAcknowledge) {
        messageToAcknowledge.raiseAcknowledgeEvent(message);
        messageToAcknowledge.raiseDoneEvent();

        return;
      }

      this.emit('message', message, (acknowledgeMessage) => {
        this._sendMessage(acknowledgeMessage);
      });
    } catch (err) {
      log.error(`${this.logId} -> Error processing HL7 message: ${err.message}`);
      this.emit('networkError', err);
    }
  }
  //#endregion
}
//#endregion

//#region Hl7MessageProcessor
class Hl7MessageProcessor extends AsyncEventEmitter {
  /**
   * Creates an instance of Hl7MessageProcessor.
   * @constructor
   */
  constructor() {
    super();

    this.hl7Message = '';
  }

  /**
   * Processes the received data until a full HL7 message is received.
   * @method
   * @param {Buffer} data - The received data.
   */
  process(data) {
    // Accumulate received data
    this.hl7Message += data.toString();

    // Find start of MLLP frame, a VT character
    const startOfMllpEnvelope = this.hl7Message.indexOf(Vt);
    if (startOfMllpEnvelope >= 0) {
      // Look for the end of the frame, a FS and CR character
      const endOfMllpEnvelope = this.hl7Message.indexOf(Fs + Cr);

      // End of block received
      if (endOfMllpEnvelope >= startOfMllpEnvelope) {
        const hl7Message = this.hl7Message.substring(
          startOfMllpEnvelope + 1 /* Skip VT */,
          endOfMllpEnvelope - startOfMllpEnvelope
        );

        // Emit the received message
        this.emit('message', hl7Message);
        this.hl7Message = '';
      }
    }
  }
}
//#endregion

//#region Exports
module.exports = Network;
//#endregion
