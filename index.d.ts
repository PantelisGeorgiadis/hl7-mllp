import { Logger } from 'winston';
import { Socket } from 'net';
import AsyncEventEmitter from 'async-eventemitter';

declare class Tag {
  /**
   * Creates an instance of Tag.
   */
  constructor(tag: string);

  /**
   * Gets the segment.
   */
  getSegment(): string;

  /**
   * Gets the segment number.
   */
  getSegmentNumber(): number;

  /**
   * Gets the field.
   */
  getField(): number;

  /**
   * Gets the component.
   */
  getComponent(): number;

  /**
   * Gets the sub-component.
   */
  getSubComponent(): number;

  /**
   * Gets the tag description.
   */
  toString(): string;
}

declare class Hl7 {
  /**
   * Creates an instance of Hl7.
   */
  constructor();

  /**
   * Parses an HL7 message string.
   */
  static parse(hl7: string): Hl7;

  /**
   * Checks whether the segment ID is a header segment.
   */
  static isHeaderSegment(segmentId: string): boolean;

  /**
   * Gets a tag value.
   */
  get(tag: Tag, defaultValue: string): string;

  /**
   * Sets a tag value.
   */
  set(tag: Tag, value: string): void;

  /**
   * Gets segments.
   */
  getSegments(segmentId?: string): Array<Tag>;

  /**
   * Counts segments.
   */
  countSegments(segmentId?: string): number;

  /**
   * Builds the HL7 message.
   */
  toString(segmentSeparator?: string): string;
}

declare class Hl7Message extends AsyncEventEmitter<AsyncEventEmitter.EventMap> {
  /**
   * Creates an instance of Hl7Message.
   */
  constructor(hl7?: Hl7 | string);

  /**
   * Creates an acknowledge message from a message.
   */
  static createAcknowledgeMessage(
    message: Hl7Message,
    opts?: {
      sendingApplication?: string;
      sendingFacility?: string;
      error?: string;
    }
  ): Hl7Message;

  /**
   * Gets a tag value.
   */
  get(tag: Tag, defaultValue: string): string;

  /**
   * Sets a tag value.
   */
  set(tag: Tag, value: string): void;

  /**
   * Gets message control ID.
   */
  getMessageControlId(): string;

  /**
   * Gets the HL7 message.
   */
  toString(segmentSeparator?: string): string;
}

declare class Network extends AsyncEventEmitter<AsyncEventEmitter.EventMap> {
  /**
   * Underlying socket.
   */
  socket: Socket;

  /**
   * Creates an instance of Network.
   */
  constructor(
    socket: Socket,
    opts?: {
      connectTimeout?: number;
      logMessages?: boolean;
      [key: string]: any;
    }
  );

  /**
   * Sends HL7 messages.
   */
  sendMessages(messages: Array<Hl7Message> | Hl7Message): void;
}

declare class Statistics {
  /**
   * Creates an instance of Statistics.
   */
  constructor();

  /**
   * Gets the received bytes.
   */
  getBytesReceived(): number;

  /**
   * Gets the sent bytes.
   */
  getBytesSent(): number;

  /**
   * Adds bytes to the received bytes.
   */
  addBytesReceived(bytes: number): void;

  /**
   * Adds bytes to the sent bytes.
   */
  addBytesSent(bytes: number): void;

  /**
   * Adds values from other statistics.
   */
  addFromOtherStatistics(statistics: Statistics): void;

  /**
   * Resets received and sent bytes.
   */
  reset(): void;

  /**
   * Gets the statistics description.
   */
  toString(): string;
}

declare class Hl7MessageHandler extends Network {
  /**
   * Message received.
   */
  onMessage(message: Hl7Message, callback: (message: Hl7Message) => void): void;
}

declare class Server extends AsyncEventEmitter<AsyncEventEmitter.EventMap> {
  /**
   * Creates an instance of Server.
   */
  constructor(handlerClass: typeof Hl7MessageHandler);

  /**
   * Listens for incoming connections.
   */
  listen(
    port: number,
    opts?: {
      connectTimeout?: number;
      logMessages?: boolean;
      [key: string]: any;
    }
  ): void;

  /**
   * Gets network statistics.
   */
  getStatistics(): Statistics;

  /**
   * Closes the server.
   */
  close(): void;
}

declare class Client extends AsyncEventEmitter<AsyncEventEmitter.EventMap> {
  /**
   * Creates an instance of Client.
   */
  constructor();

  /**
   * Adds an HL7 message.
   */
  addMessage(message: Hl7Message): void;

  /**
   * Clears all HL7 messages.
   */
  clearMessages(): void;

  /**
   * Sends messages to the remote host.
   */
  send(
    host: string,
    port: number,
    opts?: {
      connectTimeout?: number;
      logMessages?: boolean;
    }
  ): void;

  /**
   * Gets network statistics.
   */
  getStatistics(): Statistics;
}

/**
 * Logger.
 */
declare const log: Logger;

/**
 * Version.
 */
declare const version: string;

export { Tag, Hl7, Hl7Message, Client, Server, Hl7MessageHandler, Statistics, log, version };
