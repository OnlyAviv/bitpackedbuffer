import { swapEndianness } from "./utils.js";

const kPeekMark = Symbol("kPeekMark");

/**
 * A buffer implementation for bit-level reading and writing operations.
 * Supports both big-endian and little-endian byte orders.
 *
 * @class BitPackedBuffer
 */
class BitPackedBuffer {
  /**
   * Creates a new BitPackedBuffer instance.
   *
   * @param {Uint8Array|Buffer} [contents=new Uint8Array()] - Initial buffer contents
   * @param {string} [endian='big'] - Byte order ('big' or 'little')
   */
  constructor(contents, endian = "big") {
    // ||= because contents can be a false-like value if the
    // user only wants to set an endianness.
    contents ||= new Uint8Array();

    this.data =
      contents instanceof Buffer ? new Uint8Array(contents) : contents;
    this.position = 0;
    this.currentByte = 0;
    this.remainingBits = 0;
    this.isBigEndian = endian === "big";
    this.marks = new Map();
  }

  /**
   * Reads the specified number of bits from the buffer.
   *
   * @private
   * @param {number} bitCount - Number of bits to read (1-32)
   * @returns {number} The read value as an unsigned 32-bit integer
   * @throws {RangeError} If bitCount is invalid or buffer underruns
   */
  #readBits(bitCount) {
    if (bitCount <= 0 || bitCount > 32) {
      throw new RangeError("Bit count must be between 1 and 32");
    }

    let result = 0;
    let bitsObtained = 0;

    while (bitsObtained < bitCount) {
      if (this.remainingBits === 0) {
        if (this.position >= this.data.length) {
          throw new RangeError("Buffer underrun while reading bits");
        }
        this.currentByte = this.data[this.position++];
        this.remainingBits = 8;
      }

      const bitsToRead = Math.min(bitCount - bitsObtained, this.remainingBits);
      const mask = (1 << bitsToRead) - 1;
      const shift = this.remainingBits - bitsToRead;
      const bits = (this.currentByte >> shift) & mask;

      // Place bits starting from most significant position
      result = (result << bitsToRead) | bits;

      this.remainingBits -= bitsToRead;
      bitsObtained += bitsToRead;
    }

    if (bitCount > 8 && !this.isBigEndian) {
      result = swapEndianness(result, Math.ceil(bitCount / 8));
    }

    return result >>> 0;
  }

  /**
   * Writes the specified number of bits to the buffer.
   *
   * @private
   * @param {number} value - Value to write
   * @param {number} bitCount - Number of bits to write (1-32)
   * @returns {BitPackedBuffer} This buffer instance for chaining
   * @throws {RangeError} If bitCount is invalid
   */
  #writeBits(value, bitCount) {
    if (bitCount <= 0 || bitCount > 32) {
      throw new RangeError("Bit count must be between 1 and 32");
    }

    if (bitCount > 8 && !this.isBigEndian) {
      value = swapEndianness(value, Math.ceil(bitCount / 8));
    }

    value = value >>> 0;
    while (bitCount > 0) {
      if (this.remainingBits === 0) {
        if (this.position >= this.data.length) {
          this.#resize(this.position + 1);
        }
        this.currentByte = 0;
        this.remainingBits = 8;
      }

      const bitsToWrite = Math.min(bitCount, this.remainingBits);
      const shift = bitCount - bitsToWrite;
      const bits = (value >> shift) & ((1 << bitsToWrite) - 1);

      this.currentByte |= bits << (this.remainingBits - bitsToWrite);
      this.remainingBits -= bitsToWrite;
      bitCount -= bitsToWrite;

      if (this.remainingBits === 0) {
        this.data[this.position++] = this.currentByte;
      }
    }

    return this;
  }

  /**
   * Resizes the internal buffer to accommodate more data.
   *
   * @private
   * @param {number} size - Minimum size needed
   */
  #resize(size) {
    const newData = new Uint8Array(Math.max(size, this.data.length * 2));
    newData.set(this.data);
    this.data = newData;
  }

  /**
   * Aligns the read/write position to the next byte boundary.
   *
   * @param {boolean} [last=false] - If true, updates the last byte instead of advancing
   * @returns {BitPackedBuffer} This buffer instance for chaining
   */
  alignToByte(last = false) {
    if (this.remainingBits > 0 && this.remainingBits < 8) {
      if (!last) {
        this.data[this.position++] = this.currentByte;
      } else {
        this.data[this.position - 1] = this.currentByte;
      }
      this.remainingBits = 0;
      this.currentByte = 0;
    }
    return this;
  }

  /**
   * Reading operations interface
   * @typedef ReadOperations
   * @type {Object}
   * @property {function(number): number} bits - Read specified number of bits
   * @property {function(number): Uint8Array} bytes - Read specified number of bytes
   * @property {function(number, string=): string} string - Read fixed-length string
   * @property {function(string=): string} cString - Read null-terminated string
   * @property {function(number): number} int - Read signed integer of specified bits
   * @property {function(number): number} uint - Read unsigned integer of specified bits
   *
   * @type {ReadOperations}
   */
  read = {
    bits: (count) => this.#readBits(count),
    bytes: (count) => {
      const result = new Uint8Array(count);
      this.alignToByte();
      for (let i = 0; i < count; i++) {
        result[i] = this.#readBits(8);
      }
      return result;
    },
    string: (length, encoding = "utf-8") => {
      const bytes = this.read.bytes(length);
      return new TextDecoder(encoding).decode(bytes);
    },
    cString: (encoding = "utf-8") => {
      const bytes = [];
      while (true) {
        const byte = this.#readBits(8);
        if (byte === 0) break;
        bytes.push(byte);
      }
      return new TextDecoder(encoding).decode(new Uint8Array(bytes));
    },
    int: (bitCount) => {
      const value = this.#readBits(bitCount);
      const signBit = 1 << (bitCount - 1);
      return value & signBit ? value - (1 << bitCount) : value;
    },
    uint: (bitCount) => this.#readBits(bitCount),
  };

  /**
   * Writing operations interface
   * @type {Object}
   * @property {function(number, number): BitPackedBuffer} bits - Write value using specified bits
   * @property {function(Uint8Array): BitPackedBuffer} bytes - Write byte array
   * @property {function(string): BitPackedBuffer} string - Write string
   * @property {function(string): BitPackedBuffer} cString - Write null-terminated string
   * @property {function(number, number): BitPackedBuffer} int - Write signed integer
   * @property {function(number, number): BitPackedBuffer} uint - Write unsigned integer
   */
  write = {
    bits: (value, count) => this.#writeBits(value, count),
    bytes: (bytes) => {
      this.alignToByte();
      for (const byte of bytes) {
        this.#writeBits(byte, 8);
      }
      return this;
    },
    string: (str) => {
      const bytes = new TextEncoder().encode(str);
      return this.write.bytes(bytes);
    },
    cString: (str) => {
      const bytes = new TextEncoder().encode(str + "\0");
      return this.write.bytes(bytes);
    },
    int: (value, bitCount) => {
      if (value < 0) value += 1 << bitCount;
      return this.#writeBits(value, bitCount);
    },
    uint: (value, bitCount) => this.#writeBits(value, bitCount),
  };

  /**
   * Creates a named mark at the current buffer position.
   *
   * @param {string|Symbol} [name='default'] - Name for the mark
   * @returns {BitPackedBuffer} This buffer instance for chaining
   */
  mark(name = "default") {
    this.marks.set(name, {
      position: this.position,
      remainingBits: this.remainingBits,
      currentByte: this.currentByte,
    });
    return this;
  }

  /**
   * Resets the buffer position to a previously created mark.
   *
   * @param {string|Symbol} [name='default'] - Name of the mark to reset to
   * @returns {BitPackedBuffer} This buffer instance for chaining
   * @throws {Error} If the mark doesn't exist
   */
  reset(name = "default") {
    const mark = this.marks.get(name);
    if (!mark) throw new Error(`Mark '${name}' not found`);
    this.alignToByte();
    Object.assign(this, mark);
    return this;
  }

  /**
   * Reading operations that don't advance the buffer position.
   * Contains the same methods as `read` but returns values without modifying position.
   * @type {ReadOperations}
   */
  peek = Object.fromEntries(
    Object.entries(this.read).map(([name, fn]) => [
      name,
      (...args) => {
        this.mark(kPeekMark);
        const value = fn(...args);
        this.reset(kPeekMark);
        return value;
      },
    ]),
  );

  /**
   * Sets the buffer position to a specific byte offset.
   *
   * @param {number} position - Byte offset to seek to
   * @returns {BitPackedBuffer} This buffer instance for chaining
   * @throws {RangeError} If position is negative
   */
  seek(position) {
    if (position < 0) throw new RangeError("Cannot seek to negative position");
    if (position > this.data.length) this.#resize(position);
    this.alignToByte();
    this.position = position;
    this.currentByte = 0;
    this.remainingBits = 0;
    return this;
  }

  /**
   * Advances the buffer position by specified number of bytes.
   *
   * @param {number} bytes - Number of bytes to skip
   * @returns {BitPackedBuffer} This buffer instance for chaining
   */
  skip(bytes) {
    return this.seek(this.position + bytes);
  }

  /**
   * Clears all buffer contents and resets position.
   *
   * @returns {BitPackedBuffer} This buffer instance for chaining
   */
  clear() {
    this.data = new Uint8Array();
    this.position = 0;
    this.currentByte = 0;
    this.remainingBits = 0;
    this.marks.clear();
    return this;
  }

  /**
   * Checks if the entire buffer has been read.
   *
   * @returns {boolean} True if all data has been read
   */
  isComplete() {
    return this.remainingBits === 0 && this.position >= this.data.length;
  }

  /**
   * Returns a copy of the buffer's contents up to the current position.
   *
   * @returns {Uint8Array} Buffer contents
   */
  getBuffer() {
    this.alignToByte(true);
    return this.data.slice(0, this.position);
  }
}

export { BitPackedBuffer };
