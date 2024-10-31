[![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-url] [![build][build-image]][build-url] [![MIT License][license-image]][license-url] 

# hl7-mllp
HL7 Minimum Lower Layer Protocol (MLLP) implementation for Node.js.

### Note
**This effort is a work-in-progress and should not be used for production or clinical purposes.**

### Install

	npm install hl7-mllp

### Build

	npm install
	npm run build

### Examples

#### Client
```js
const hl7Mllp = require('hl7-mllp');
const { Client, Hl7Message } = hl7Mllp;

const client = new Client();
const hl7Message = new Hl7Message(
  `MSH|^~\&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|
   PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|`
);
hl7Message.on('acknowledge', (ackMessage) => {
  console.log(ackMessage.toString());
});

client.addMessage(hl7Message);
client.send('127.0.0.1', 12345);
```

#### Server
```js
const hl7Mllp = require('hl7-mllp');
const { Server, Hl7Message, Hl7MessageHandler } = hl7Mllp;

class Hl7MllpMessageHandler extends Hl7MessageHandler {
  constructor(socket, opts) {
    super(socket, opts);
  }

  // Handle incoming messages
  onMessage(message, callback) {
    console.log(message.toString());
    callback(Hl7Message.createAcknowledgeMessage(message));
  }
}

const server = new Server(Hl7MllpMessageHandler);
server.on('networkError', (e) => {
  console.log('Network error: ', e);
});
server.listen(port);

// When done
server.close();
```

### License
hl7-mllp is released under the MIT License.

[npm-url]: https://npmjs.org/package/hl7-mllp
[npm-version-image]: https://img.shields.io/npm/v/hl7-mllp.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/hl7-mllp.svg?style=flat

[build-url]: https://github.com/PantelisGeorgiadis/hl7-mllp/actions/workflows/build.yml
[build-image]: https://github.com/PantelisGeorgiadis/hl7-mllp/actions/workflows/build.yml/badge.svg?branch=master

[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE.txt
