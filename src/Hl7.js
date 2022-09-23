const moment = require('moment');
const AsyncEventEmitter = require('async-eventemitter');

//#region Tag
class Tag {
  /**
   * Creates an instance of Tag.
   * @constructor
   * @param {string} tag - Tag that represents a path within an HL7 message.
   */
  constructor(tag) {
    this.tag = tag || '';
    if (this.tag.length < 3) {
      throw Error('Tag needs to contain at least the segment information');
    }

    this.segment = this.tag.substring(0, 3).toUpperCase();

    this.segmentNumber = 1;
    if (tag[3] === '[') {
      const segmentNumberStr = this.tag.substring(4, this.tag.indexOf(']'));
      this.segmentNumber = parseInt(segmentNumberStr);
    }

    const parts = this.tag.split('.');
    if (parts.length > 4) {
      throw Error('Tag should not contain more than four parts');
    }

    this.field = 0;
    this.component = 0;
    this.subComponent = 0;

    if (parts.length >= 2) {
      this.field = parseInt(parts[1]);
    }
    if (parts.length >= 3) {
      this.component = parseInt(parts[2]);
    }
    if (parts.length === 4) {
      this.subComponent = parseInt(parts[3]);
    }
  }

  /**
   * Gets the segment.
   * @method
   * @returns {string} Segment.
   */
  getSegment() {
    return this.segment;
  }

  /**
   * Gets the segment number.
   * @method
   * @returns {number} Segment number.
   */
  getSegmentNumber() {
    return this.segmentNumber;
  }

  /**
   * Gets the field.
   * @method
   * @returns {number} Field.
   */
  getField() {
    return this.field;
  }

  /**
   * Gets the component.
   * @method
   * @returns {number} Component.
   */
  getComponent() {
    return this.component;
  }

  /**
   * Gets the sub-component.
   * @method
   * @returns {number} Sub-component.
   */
  getSubComponent() {
    return this.subComponent;
  }

  /**
   * Gets the tag description.
   * @method
   * @returns {string} Tag description.
   */
  toString() {
    let tag = this.getSegment();
    if (this.getSegmentNumber() > 1) {
      tag += `[${this.getSegmentNumber()}]`;
    }
    if (this.getField() > 0) {
      tag += `.${this.getField()}`;
    }
    if (this.getComponent() > 0) {
      tag += `.${this.getComponent()}`;
    }
    if (this.getSubComponent() > 0) {
      tag += `.${this.getSubComponent()}`;
    }

    return tag;
  }
}
//#endregion

//#region Hl7
class Hl7 {
  /**
   * Creates an instance of Hl7.
   * @constructor
   */
  constructor() {
    this.segments = [];
    this.fieldDelimiter = '|';
    this.componentDelimiter = '^';
    this.subComponentDelimiter = '&';
  }

  /**
   * Parses an HL7 message string.
   * @method
   * @static
   * @param {string} hl7 - HL7 message string.
   * @returns {Hl7} The parsed HL7 message object.
   */
  static parse(hl7) {
    const message = new Hl7();
    const lines = hl7.split(/\r|\n|\r\n/);

    lines.forEach((line) => {
      line = line.trim();
      if (!line) {
        return;
      }

      const segmentId = line.substring(0, 3);
      if (Hl7.isHeaderSegment(segmentId)) {
        this.fieldDelimiter = line[3];
        this.componentDelimiter = line[4];
        this.subComponentDelimiter = line[7];

        const segment = [];
        segment.push(segmentId);
        segment.push(this.fieldDelimiter);
        segment.push(...line.substring(4).split(this.fieldDelimiter));

        message.segments.push(segment);
      } else {
        message.segments.push(line.split(this.fieldDelimiter));
      }
    });

    return message;
  }

  /**
   * Checks whether the segment ID is a header segment.
   * @method
   * @static
   * @param {string} segmentId - Segment ID.
   * @returns {boolean} Flag indicating whether the segment ID is a header segment.
   */
  static isHeaderSegment(segmentId) {
    return segmentId === 'MSH' || segmentId === 'BHS' || segmentId === 'FHS';
  }

  /**
   * Gets a tag value.
   * @method
   * @param {Tag} tag - Tag.
   * @param {string} defaultValue - Default value.
   * @returns {string} Value or default.
   */
  get(tag, defaultValue) {
    let value = undefined;
    if (tag.getSubComponent() > 0) {
      value = this._getSubComponent(tag);
    } else if (tag.getComponent() > 0) {
      value = this._getComponent(tag);
    } else if (tag.getField() > 0) {
      value = this._getField(tag);
    } else {
      throw Error('Invalid tag for get operation');
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Sets a tag value.
   * @method
   * @param {Tag} tag - Tag.
   * @param {string} value - Value.
   */
  set(tag, value) {
    if (tag.getSubComponent() > 0) {
      this._setSubComponent(tag, value);
    } else if (tag.getComponent() > 0) {
      this._setComponent(tag, value);
    } else if (tag.getField() > 0) {
      this._setField(tag, value);
    } else {
      throw Error('Invalid tag for set operation');
    }
  }

  /**
   * Gets segments.
   * @method
   * @param {string} [segmentId] - Segment ID.
   * @returns {Array<Tag>} Segment tags.
   */
  getSegments(segmentId) {
    let tags = [];
    if (segmentId === undefined) {
      const segments = [];
      this.segments.forEach((s) => {
        let segment = segments.find((seg) => seg.id === s[0]);
        segments.push(segment === undefined ? { id: s[0], n: 0 } : { id: s[0], n: segment.n + 1 });
      });
      segments.forEach((s) => {
        tags.push(new Tag(`${s.id}[${s.n}]`));
      });
    } else {
      let n = 0;
      this.segments.forEach((s) => {
        if (s[0] === segmentId) {
          tags.push(new Tag(`${segmentId}[${++n}]`));
        }
      });
    }

    return tags;
  }

  /**
   * Counts segments.
   * @method
   * @param {string} [segmentId] - Segment ID.
   * @returns {number} Segment count.
   */
  countSegments(segmentId) {
    if (segmentId === undefined) {
      return this.segments.length;
    }

    let n = 0;
    this.segments.forEach((s) => {
      if (s[0] === segmentId) {
        n++;
      }
    });

    return n;
  }

  /**
   * Builds the HL7 message.
   * @method
   * @param {string} [segmentSeparator] - Segment separator.
   * @returns {string} HL7 message.
   */
  toString(segmentSeparator) {
    segmentSeparator = segmentSeparator || '\r';
    let fieldDelimiter = '|';
    const message = [];

    this.segments.forEach((segment) => {
      const segmentId = segment[0];
      if (Hl7.isHeaderSegment(segmentId)) {
        fieldDelimiter = segment[1];

        message.push(segmentId);
        message.push(fieldDelimiter);
        message.push(segment.slice(2, segment.length).join(fieldDelimiter));
      } else {
        message.push(segment.join(fieldDelimiter));
      }
      message.push(segmentSeparator);
    });

    return message.join('');
  }

  //#region Private Methods
  /**
   * Gets segment value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @returns {string} Segment.
   */
  _getSegment(tag) {
    let segment = undefined;
    let number = Math.max(1, tag.getSegmentNumber());
    this.segments.forEach((s) => {
      if (s[0] === tag.getSegment()) {
        if (--number === 0) {
          segment = s;
        }
      }
    });

    return segment;
  }

  /**
   * Gets field value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @returns {string} Field.
   */
  _getField(tag) {
    const segments = this._getSegment(tag);
    if (segments !== undefined) {
      if (tag.getField() < segments.length) {
        return segments[tag.getField()];
      }
    }

    return undefined;
  }

  /**
   * Sets field value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @param {Tag} value - Value.
   */
  _setField(tag, value) {
    let segment = this._getSegment(tag);
    if (segment === undefined) {
      segment = [];
      segment.push(tag.getSegment());
      if (Hl7.isHeaderSegment(tag.getSegment())) {
        segment.push('|');
        segment.push('^~\\&');
      }
      this.segments.push(segment);
    }

    while (segment.length <= tag.getField()) {
      segment.push('');
    }
    segment[tag.getField()] = value;

    if (Hl7.isHeaderSegment(tag.getSegment())) {
      if (tag.getField() === 1) {
        this.fieldDelimiter = value[0];
      } else if (tag.getField() === 2) {
        this.componentDelimiter = value[0];
        this.subComponentDelimiter = value[3];
      }
    }
  }

  /**
   * Gets component value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @returns {string} Component.
   */
  _getComponent(tag) {
    const field = this._getField(tag);
    if (field === undefined) {
      return undefined;
    }

    const components = field.split(this.componentDelimiter);
    if (tag.getComponent() <= components.length) {
      return components[tag.getComponent() - 1];
    }

    return undefined;
  }

  /**
   * Sets component value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @param {Tag} value - Value.
   */
  _setComponent(tag, value) {
    let field = this._getField(tag);
    if (field === undefined) {
      field = '';
    }

    const components = field.split(this.componentDelimiter);
    while (components.length < tag.getComponent()) {
      components.push('');
    }
    components[tag.getComponent() - 1] = value;

    this._setField(tag, components.join(this.componentDelimiter));
  }

  /**
   * Gets sub-component value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @returns {string} Sub-component.
   */
  _getSubComponent(tag) {
    const component = this._getComponent(tag);
    if (component === undefined) {
      return undefined;
    }

    const subs = component.split(this.subComponentDelimiter);
    if (tag.getSubComponent() <= subs.length) {
      return subs[tag.getSubComponent() - 1];
    }

    return undefined;
  }

  /**
   * Sets sub-component value.
   * @method
   * @private
   * @param {Tag} tag - Tag.
   * @param {Tag} value - Value.
   */
  _setSubComponent(tag, value) {
    let component = this._getComponent(tag);
    if (component === undefined) {
      component = '';
    }

    const subs = component.split(this.subComponentDelimiter);
    while (subs.length < tag.getSubComponent) {
      subs.push('');
    }
    subs[tag.getSubComponent() - 1] = value;

    this._setComponent(tag, subs.join(this.subComponentDelimiter));
  }
  //#endregion
}
//#endregion

//#region Hl7Message
class Hl7Message extends AsyncEventEmitter {
  /**
   * Creates an instance of Hl7Message.
   * @constructor
   * @param {Hl7|string} [hl7] - HL7 object or string.
   */
  constructor(hl7) {
    super();

    if (hl7 instanceof Hl7) {
      this.hl7 = hl7;
      return;
    }
    if (typeof hl7 === 'string' || hl7 instanceof String) {
      this.hl7 = Hl7.parse(hl7);
      return;
    }
    this.hl7 = new Hl7();
  }

  /**
   * Gets a tag value.
   * @method
   * @param {Tag} tag - Tag.
   * @param {string} defaultValue - Default value.
   * @returns {string} Value or default.
   */
  get(tag, defaultValue) {
    return this.hl7.get(tag, defaultValue);
  }

  /**
   * Sets a tag value.
   * @method
   * @param {Tag} tag - Tag.
   * @param {string} value - Value.
   */
  set(tag, value) {
    this.hl7.set(tag, value);
  }

  /**
   * Gets message control ID.
   * @method
   * @return {string} Message control ID.
   */
  getMessageControlId() {
    const msaCount = this.hl7.countSegments('MSA');
    return msaCount > 0 ? this.hl7.get(new Tag('MSA[0].2')) : this.hl7.get(new Tag('MSH[0].10'));
  }

  /**
   * Creates an acknowledge message from a message.
   * @method
   * @static
   * @param {Hl7Message} message - HL7 message object.
   * @param {Object} [opts] - Acknowledge options.
   * @param {string} [opts.sendingApplication] - Sending application.
   * @param {string} [opts.sendingFacility] - Sending facility.
   * @returns {Hl7Message} Acknowledge HL7 message object.
   * @throws Error if message is not an instance of Hl7Message.
   */
  static createAcknowledgeMessage(message, opts) {
    if (!(message instanceof Hl7Message)) {
      throw new Error('Message should be an instance of Hl7Message');
    }
    opts = opts || {};

    const receivingApplication = message.get(new Tag('MSH[0].3'), '');
    const receivingFacility = message.get(new Tag('MSH[0].4'), '');
    const messageControlId = message.get(new Tag('MSH[0].10'), '');
    const versionId = message.get(new Tag('MSH[0].12'), '');

    const ackMessage = new Hl7Message();
    ackMessage.set(new Tag('MSH[0].3'), opts.sendingApplication || 'HL7-MLLP');
    ackMessage.set(new Tag('MSH[0].4'), opts.sendingFacility || '');
    ackMessage.set(new Tag('MSH[0].5'), receivingApplication);
    ackMessage.set(new Tag('MSH[0].6'), receivingFacility);
    ackMessage.set(new Tag('MSH[0].7'), moment(new Date()).format('YYYYMMDDHHmmss'));
    ackMessage.set(new Tag('MSH[0].9'), 'ACK');
    ackMessage.set(new Tag('MSH[0].12'), versionId);

    ackMessage.set(new Tag('MSA[0].1'), 'AA');
    ackMessage.set(new Tag('MSA[0].2'), messageControlId);

    return ackMessage;
  }

  /**
   * Raises message event.
   * @method
   * @param {Hl7Message} message - HL7 message object.
   */
  raiseAcknowledgeEvent(message) {
    this.emit('acknowledge', message);
  }

  /**
   * Raises done event.
   * @method
   */
  raiseDoneEvent() {
    this.emit('done');
  }

  /**
   * Gets the HL7 message.
   * @method
   * @param {string} [segmentSeparator] - Segment separator.
   * @returns {string} HL7 message.
   */
  toString(segmentSeparator) {
    return this.hl7.toString(segmentSeparator);
  }
}
//#endregion

//#region Exports
module.exports = { Tag, Hl7, Hl7Message };
//#endregion
