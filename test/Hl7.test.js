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
