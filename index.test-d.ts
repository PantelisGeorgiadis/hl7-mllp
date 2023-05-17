import { expectType, expectError } from 'tsd';
import {
  Tag,
  Hl7,
  Hl7Message,
  Client,
  Server,
  Hl7MessageHandler,
  Statistics,
  log,
  version,
} from '.';

// log
expectType<typeof log>(log.error('error'));

// version
expectType<string>(version);

// Tag
expectError(new Tag());
expectError(new Tag(1));
expectType<Tag>(new Tag('OBR[0].1.2.3'));

const tag = new Tag('OBR[0].1.2.3');
expectType<string>(tag.getSegment());
expectType<number>(tag.getSegmentNumber());
expectType<number>(tag.getField());
expectType<number>(tag.getComponent());
expectType<number>(tag.getSubComponent());
expectType<string>(tag.toString());

// Hl7
expectType<Hl7>(new Hl7());
expectError(Hl7.parse(1));
expectType<Hl7>(Hl7.parse('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|'));
expectError(Hl7.isHeaderSegment(1));
expectType<boolean>(Hl7.isHeaderSegment('MSH'));

const hl7 = Hl7.parse('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|');
expectError(hl7.get('1'));
expectError(hl7.get('1', 2));
expectType<string>(hl7.get(tag, ''));
expectError(hl7.set('1'));
expectError(hl7.set('1', 2));
expectType<void>(hl7.set(tag, '1'));
expectError(hl7.getSegments(1));
expectType<Array<Tag>>(hl7.getSegments('OBR'));
expectType<Array<Tag>>(hl7.getSegments());
expectError(hl7.countSegments(1));
expectType<number>(hl7.countSegments('OBR'));
expectType<number>(hl7.countSegments());
expectError(hl7.toString(1));
expectType<string>(hl7.toString());

// Hl7Message
expectError(new Hl7Message(1));
expectType<Hl7Message>(new Hl7Message());
expectType<Hl7Message>(new Hl7Message('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|'));
expectType<Hl7Message>(
  new Hl7Message(Hl7.parse('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|'))
);
expectError(Hl7Message.createAcknowledgeMessage(1));
expectError(Hl7Message.createAcknowledgeMessage(1, '2'));
expectType<Hl7Message>(
  Hl7Message.createAcknowledgeMessage(
    new Hl7Message('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|')
  )
);

const hl7Message = new Hl7Message(Hl7.parse('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|'));
expectError(hl7Message.get('1'));
expectError(hl7Message.get('1', 2));
expectType<string>(hl7Message.get(tag, ''));
expectError(hl7Message.set('1'));
expectError(hl7Message.set('1', 2));
expectType<void>(hl7Message.set(tag, '1'));
expectType<string>(hl7Message.getMessageControlId());
expectError(hl7Message.toString(1));
expectType<string>(hl7Message.toString());

// Statistics
const statistics = new Statistics();
expectType<number>(statistics.getBytesReceived());
expectType<number>(statistics.getBytesSent());
expectError(statistics.addBytesReceived('1'));
expectError(statistics.addBytesSent('1'));
expectError(statistics.addFromOtherStatistics('1'));
expectType<void>(statistics.reset());
expectType<string>(statistics.toString());

// Server
class Hl7MessageHandlerTest extends Hl7MessageHandler {
  onMessage(message: Hl7Message, callback: (message: Hl7Message) => void) {}
}

expectError(new Server(1));
expectType<Server>(new Server(Hl7MessageHandlerTest));

const server = new Server(Hl7MessageHandlerTest);
expectError(server.listen('2104'));
expectError(server.listen(2104, '1'));
expectType<void>(server.listen(2104));
expectType<void>(server.close());
expectType<Statistics>(server.getStatistics());

// Client
expectType<Client>(new Client());

const client = new Client();
expectType<void>(client.clearMessages());
expectError(client.addMessage('1'));
expectType<void>(
  client.addMessage(new Hl7Message('MSH|^~&|||||200001010000||ADT|1234567890|D|2.2|'))
);
expectType<Statistics>(client.getStatistics());
expectError(client.send('1'));
expectError(client.send('1', '2'));
expectError(client.send('1', '2', 3));
