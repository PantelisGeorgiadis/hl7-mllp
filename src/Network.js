const { Hl7Message } = require('./Hl7');
const log = require('./log');

const AsyncEventEmitter = require('async-eventemitter');
const { SmartBuffer } = require('smart-buffer');

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
   * @param {Array<Hl7Message>|Hl7Message} messages - HL7 messages to send.
   */
  sendMessages(messages) {
    const msgs = Array.isArray(messages) ? messages : [messages];
    this.messages.push(...msgs);
    this._sendNextMessages();
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

      const hl7Bytes = new TextEncoder().encode(message.toString());
      const startBlock = [0x0b];
      this.socket.write(Buffer.from(startBlock));
      this.socket.write(hl7Bytes);
      const endBlock = [0x1c, 0x0d];
      this.socket.write(Buffer.from(endBlock));
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
  }

  /**
   * Processes the received data until a full HL7 message is received.
   * @method
   * @param {Buffer} data - The received data.
   */
  process(data) {
    const inBuffer = SmartBuffer.fromBuffer(data, 'ascii');
    const outBuffer = SmartBuffer.fromOptions({
      encoding: 'ascii',
    });

    let ib = 0x00;
    for (; inBuffer.readUInt8() !== 0x0b; );
    for (;;) {
      if (ib === 0x1c) {
        ib = inBuffer.readUInt8();
        if (ib === 0x0d) {
          break;
        }
        outBuffer.writeUInt8(0x1c);
        outBuffer.writeUInt8(ib);
      } else {
        ib = inBuffer.readUInt8();
        if (ib !== 0x1c) {
          outBuffer.writeUInt8(ib);
        }
      }
    }
    const hl7 = new TextDecoder().decode(outBuffer.toBuffer());
    this.emit('message', hl7);
  }
}
//#endregion

//#region Exports
module.exports = Network;
//#endregion
