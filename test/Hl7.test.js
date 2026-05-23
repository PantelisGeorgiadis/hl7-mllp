const { Hl7, Hl7Message, Tag } = require('./../src/Hl7');

const chai = require('chai');
const expect = chai.expect;

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomString(len) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (let i = 0; i < len; i++) {
    const randomPosition = Math.floor(Math.random() * chars.length);
    randomString += chars.substring(randomPosition, randomPosition + 1);
  }

  return randomString;
}

describe('Hl7', () => {
  it('should correctly construct a Tag', () => {
    const tag1 = new Tag('OBR[0].1.2.3');

    expect(tag1.getSegment()).to.be.eq('OBR');
    expect(tag1.getSegmentNumber()).to.be.eq(0);
    expect(tag1.getField()).to.be.eq(1);
    expect(tag1.getComponent()).to.be.eq(2);
    expect(tag1.getSubComponent()).to.be.eq(3);

    const tag2 = new Tag('PID[1].1');

    expect(tag2.getSegment()).to.be.eq('PID');
    expect(tag2.getSegmentNumber()).to.be.eq(1);
    expect(tag2.getField()).to.be.eq(1);
    expect(tag2.getComponent()).to.be.eq(0);
    expect(tag2.getSubComponent()).to.be.eq(0);

    const tag3 = new Tag('PID.4');

    expect(tag3.getSegment()).to.be.eq('PID');
    expect(tag3.getSegmentNumber()).to.be.eq(1);
    expect(tag3.getField()).to.be.eq(4);
    expect(tag3.getComponent()).to.be.eq(0);
    expect(tag3.getSubComponent()).to.be.eq(0);
    expect(tag3.toString()).to.be.a('string');
  });

  it('should throw in case of constructing an invalid Tag', () => {
    expect(() => {
      const tag = new Tag('OB');
    }).to.throw();

    expect(() => {
      const tag = new Tag('PID[1].1.2.3.4');
    }).to.throw();

    expect(() => {
      const tag = new Tag(undefined);
    }).to.throw();
  });

  it('should produce a correct Tag string for all toString() branches', () => {
    // segmentNumber > 1 branch
    const tag1 = new Tag('PID[2].1');
    expect(tag1.toString()).to.equal('PID[2].1');

    // field + component branches
    const tag2 = new Tag('OBR.2.3');
    expect(tag2.toString()).to.equal('OBR.2.3');

    // field + component + subComponent branches
    const tag3 = new Tag('OBX.1.2.3');
    expect(tag3.toString()).to.equal('OBX.1.2.3');
  });

  it('should correctly parse an HL7 message with empty lines', () => {
    const hl7 = Hl7.parse(
      '\nMSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|\n\n'
    );
    expect(hl7.countSegments('MSH')).to.be.eq(1);
  });

  it('should correctly get all segments and count segments without arguments', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|\r' +
        'PID||123456^^^2^ID 1|654321||DOE^JOHN^^^^|DOE^JOHN^^^^|19480203|M|'
    );

    const allSegments = hl7.getSegments();
    expect(allSegments).to.be.an('array');
    expect(allSegments.length).to.be.eq(2);

    const pidSegments = hl7.getSegments('PID');
    expect(pidSegments.length).to.be.eq(1);

    const totalCount = hl7.countSegments();
    expect(totalCount).to.be.eq(2);

    const mshCount = hl7.countSegments('MSH');
    expect(mshCount).to.be.eq(1);
  });

  it('should throw for get and set operations on segment-only tags', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );

    expect(() => {
      hl7.get(new Tag('MSH'));
    }).to.throw();

    expect(() => {
      hl7.set(new Tag('MSH'), 'value');
    }).to.throw();
  });

  it('should return the default value when component index is out of bounds', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );

    // MSH field 3 is 'SENDINGAPP' — no component delimiter, so only 1 component
    // asking for component 5 should return undefined and fall back to defaultValue
    const value = hl7.get(new Tag('MSH.3.5'), 'default');
    expect(value).to.be.eq('default');
  });

  it('should correctly construct Hl7Message with various constructor arguments', () => {
    // No argument — creates empty message
    const message1 = new Hl7Message();
    expect(message1.toString()).to.be.a('string');

    // Hl7 instance
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    const message2 = new Hl7Message(hl7);
    expect(message2.get(new Tag('MSH.3'))).to.be.eq('SENDINGAPP');
  });

  it('should throw when createAcknowledgeMessage receives a non-Hl7Message', () => {
    expect(() => {
      Hl7Message.createAcknowledgeMessage('not a message');
    }).to.throw();
  });

  it('should create an acknowledge message with custom sendingApplication and sendingFacility', () => {
    const message = new Hl7Message(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );

    const ack = Hl7Message.createAcknowledgeMessage(message, {
      sendingApplication: 'MYAPP',
      sendingFacility: 'MYFACILITY',
    });

    expect(ack.get(new Tag('MSH.3'))).to.be.eq('MYAPP');
    expect(ack.get(new Tag('MSH.4'))).to.be.eq('MYFACILITY');
    expect(ack.get(new Tag('MSA.1'))).to.be.eq('AA');
  });

  it('should produce an HL7 message string with a custom segment separator', () => {
    const message = new Hl7Message(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    const str = message.toString('\n');
    expect(str).to.include('\n');
  });

  it('should correctly set and get a component-level tag (no subComponent)', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    hl7.set(new Tag('PID.5.2'), 'DOE');
    expect(hl7.get(new Tag('PID.5.2'))).to.be.eq('DOE');
  });

  it('should update fieldDelimiter and encoding characters when setting header segment fields 1 and 2', () => {
    const hl7 = new Hl7();
    hl7.set(new Tag('MSH.1'), '|');
    hl7.set(new Tag('MSH.2'), '^~\\&');
    expect(hl7.get(new Tag('MSH.1'))).to.be.eq('|');
    expect(hl7.get(new Tag('MSH.2'))).to.be.eq('^~\\&');
  });

  it('should return the default value when subComponent has no parent component or is out of bounds', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );

    // No XYZ segment — component will be undefined, so subComponent lookup returns undefined
    const val1 = hl7.get(new Tag('XYZ.1.1.1'), 'none');
    expect(val1).to.be.eq('none');

    // MSH.3 is 'SENDINGAPP' — component 1 exists but has no '&' subComponent delimiters
    // Asking for subComponent 5 (out of bounds for a single-value component)
    const val2 = hl7.get(new Tag('MSH.3.1.5'), 'none');
    expect(val2).to.be.eq('none');
  });

  it('should correctly set and get a Tag for an Hl7 object and Hl7Message object', () => {
    const hl7 = Hl7.parse(
      'MSH|^~&|SENDINGAPP|SENDINGFACILITY|RECEIVINGAPP|RECEIVINGFACILITY|200001010000||ADT|1234567890|D|2.2|'
    );
    const hl7Message = new Hl7Message(hl7);
    const segmentLen = getRandomInteger(2, 8);
    const fieldLen = getRandomInteger(2, 8);
    const componentLen = getRandomInteger(2, 8);
    const subComponentLen = getRandomInteger(2, 8);

    const segments = ['EVN', 'OBR', 'OBX', 'ORC', 'PID'];
    const randomSegment = segments[Math.floor(Math.random() * segments.length)];

    for (let i = 1; i < segmentLen; i++) {
      for (let j = 1; j < fieldLen; j++) {
        for (let k = 1; k < componentLen; k++) {
          for (let l = 1; l < subComponentLen; l++) {
            const strLen = getRandomInteger(4, 64);
            const randomTag = new Tag(`${randomSegment}[${i}].${j}.${k}.${l}`);
            const randomString = getRandomString(strLen);

            hl7.set(randomTag, randomString);
            hl7Message.set(randomTag, randomString);

            const hl7String = hl7.toString();
            const hl7MessageString = hl7Message.toString();

            const hl7Parsed = Hl7.parse(hl7String);
            const hl7MessageParsed = new Hl7Message(hl7MessageString);

            expect(hl7Parsed.get(randomTag)).to.be.eq(randomString);
            expect(hl7MessageParsed.get(randomTag)).to.be.eq(randomString);
          }
        }
      }
    }
  });
});
