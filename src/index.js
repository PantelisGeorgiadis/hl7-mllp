const { Tag, Hl7, Hl7Message } = require('./Hl7');
const Client = require('./Client');
const { Server, Hl7MessageHandler } = require('./Server');
const log = require('./log');
const version = require('./version');

const hl7Mllp = {
  Tag,
  Hl7,
  Hl7Message,
  Client,
  Server,
  Hl7MessageHandler,
  log,
  version,
};

//#region Exports
module.exports = hl7Mllp;
//#endregion
