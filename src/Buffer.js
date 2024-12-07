import { le2be } from "./utils.js";

const kPeekMark = Symbol("kPeekMark");

export class BitPackedBuffer {
  /**
   * Creates a new BitPackedBuffer instance.
   * @param {Uint8Array|Buffer} [contents] - Initial buffer contents. Defaults to empty Uint8Array if not provided.
   * @param {string} [endian='big'] - Byte order ('big' or 'little'). Defaults to 'big'.
   */
  constructor(contents, endian = "big") {
    // Use ||=, in case the user passes a false value to JUST set endian-ness.
    contents ||= new Uint8Array();
    // Initialize with either a fixed size or existing content
    this.data =
      contents instanceof Buffer ? new Uint8Array(contents) : contents;
    this.position = 0;
    this.currentByte = null;
    this.remainingBits = 0;
    this.isBigEndian = endian === "big";
    this.marks = new Map(); // For marking positions
  }

  /**
   * Throws a RangeError if the specified position is outside the buffer bounds.
   * @private
   * @param {number} position - The position to check.
   * @param {string} operation - Description of the operation being performed.
   * @throws {RangeError} If position is out of bounds.
   */
  #throwIfOutOfBounds(position, operation) {
    if (position < 0 || position >= this.data.length) {
      throw new RangeError(
        `Buffer ${operation} out of bounds: position ${position} (size: ${this.data.length})`,
      );
    }
  }

  /**
   * Seeks to a specific position in the buffer.
   * @param {number} position - The position to seek to.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   * @throws {RangeError} If position is negative.
   */
  seek(position) {
    if (position < 0) {
      throw new RangeError("Cannot seek to negative position");
    }
    if (position > this.data.length) {
      this.#resize(position);
    }

    this.alignToByte();
    this.position = position;
    this.currentByte = null;
    this.remainingBits = 0;
    return this;
  }

  /**
   * Skips a specified number of bytes.
   * @param {number} bytes - Number of bytes to skip.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   */
  skip(bytes) {
    return this.seek(this.position + bytes);
  }

  /**
   * Marks the current position for later return.
   * @param {string|Symbol} [name='default'] - Name to associate with the mark.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
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
   * Resets the buffer position to a previously marked position.
   * @param {string|Symbol} [name='default'] - Name of the mark to reset to.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   * @throws {Error} If the specified mark is not found.
   */
  reset(name = "default") {
    const mark = this.marks.get(name);
    if (!mark) {
      throw new Error(`Mark '${name}' not found`);
    }

    this.alignToByte();
    this.position = mark.position;
    this.remainingBits = mark.remainingBits;
    this.currentByte = mark.currentByte;
    return this;
  }

  /**
   * Resizes the internal buffer to accommodate new data.
   * @private
   * @param {number} newSize - The new size for the buffer.
   */
  #resize(newSize) {
    const newData = new Uint8Array(newSize);
    newData.set(this.data);
    this.data = newData;
  }

  /**
   * Reads bits without advancing the buffer position.
   * @param {number} bitCount - Number of bits to peek.
   * @returns {number} The peeked value.
   */
  peek(bitCount) {
    this.mark(kPeekMark);
    const value = this.readBits(bitCount);
    this.reset(kPeekMark);
    return value;
  }

  /**
   * Reads bytes without advancing the buffer position.
   * @param {number} count - Number of bytes to peek.
   * @returns {Uint8Array} The peeked bytes.
   */
  peekBytes(count) {
    this.mark(kPeekMark);
    const value = this.readBytes(count);
    this.reset(kPeekMark);
    return value;
  }

  /**
   * Reads a specified number of bits from the buffer.
   * @param {number} bitCount - Number of bits to read (1-32).
   * @returns {number} The read value.
   * @throws {TypeError} If bitCount is not a positive integer.
   * @throws {RangeError} If bitCount is greater than 32.
   */
  readBits(bitCount) {
    if (!Number.isInteger(bitCount) || bitCount <= 0) {
      throw new TypeError("Bit count must be a positive integer");
    }
    if (bitCount > 32) {
      throw new RangeError("Cannot read more than 32 bits at once");
    }

    let result = 0;
    let bitsObtained = 0;

    while (bitsObtained < bitCount) {
      if (this.remainingBits === 0) {
        this.#throwIfOutOfBounds(this.position, "read");
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

    // If reading multiple bytes and big endian, swap the byte order
    if (bitCount > 8 && this.isBigEndian) {
      result = le2be(result, Math.ceil(bitCount / 8));
    }

    return result >>> 0;
  }

  /**
   * Reads a specified number of bytes from the buffer.
   * @param {number} count - Number of bytes to read.
   * @returns {Uint8Array} The read bytes.
   * @throws {TypeError} If count is not a non-negative integer.
   * @throws {Error} If buffer underrun occurs.
   */
  readBytes(count) {
    if (!Number.isInteger(count) || count < 0) {
      throw new TypeError("Byte count must be a non-negative integer");
    }

    const result = new Uint8Array(count);
    this.alignToByte(true);

    for (let i = 0; i < count; i++) {
      if (this.position >= this.data.length) {
        throw new Error("Buffer underrun while reading bytes");
      }
      result[i] = this.readBits(8);
    }
    return result;
  }

  /**
   * Writes a value using the specified number of bits.
   * @param {number} value - The value to write.
   * @param {number} bitCount - Number of bits to write (1-32).
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   * @throws {TypeError} If value is not an integer or bitCount is not a positive integer.
   * @throws {RangeError} If bitCount is greater than 32.
   */
  writeBits(value, bitCount) {
    if (!Number.isInteger(bitCount) || bitCount <= 0) {
      throw new TypeError("Bit count must be a positive integer");
    }
    if (bitCount > 32) {
      throw new RangeError("Cannot write more than 32 bits at once");
    }
    if (!Number.isInteger(value)) {
      throw new TypeError("Value must be an integer");
    }

    // For multi-byte values, handle endianness
    if (bitCount > 8 && this.isBigEndian) {
      value = le2be(value, Math.ceil(bitCount / 8));
    }

    // Ensure we have enough space
    const requiredBytes = Math.ceil(
      (this.position * 8 - this.remainingBits + bitCount) / 8,
    );
    if (requiredBytes > this.data.length) {
      this.#resize(requiredBytes);
    }

    value &= (1 << bitCount) - 1;

    while (bitCount > 0) {
      if (this.remainingBits === 0) {
        this.currentByte = 0;
        this.remainingBits = 8;
      }

      const bitsToWrite = Math.min(bitCount, this.remainingBits);
      const mask = (1 << bitsToWrite) - 1;

      // Extract the most significant bits first
      const shift = bitCount - bitsToWrite;
      const bits = (value >> shift) & mask;

      // Place bits at the most significant position of remaining space
      this.currentByte |= bits << (this.remainingBits - bitsToWrite);

      bitCount -= bitsToWrite;
      this.remainingBits -= bitsToWrite;

      if (this.remainingBits === 0) {
        this.data[this.position++] = this.currentByte;
        this.currentByte = 0;
      }
    }

    return this;
  }

  /**
   * Writes bytes to the buffer.
   * @param {Uint8Array|Buffer} bytes - The bytes to write.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   * @throws {TypeError} If input is not a Uint8Array or Buffer.
   */
  writeBytes(bytes) {
    if (!(bytes instanceof Uint8Array) && !(bytes instanceof Buffer)) {
      throw new TypeError("Input must be Uint8Array or Buffer");
    }

    this.alignToByte();
    const requiredSpace = this.position + bytes.length;
    if (requiredSpace > this.data.length) {
      this.#resize(requiredSpace);
    }

    for (const byte of bytes) {
      this.writeBits(byte, 8);
    }
    return this;
  }

  /**
   * Aligns the current position to a byte boundary.
   * @param {boolean} [last=false] - If true, aligns to last byte; if false, aligns to next byte.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   */
  alignToByte(last = false) {
    if (this.remainingBits > 0 && this.remainingBits < 8) {
      if (!last) {
        const neededSize = this.position + 1;
        if (neededSize > this.data.length) this.#resize(neededSize);
        this.data[this.position++] = this.currentByte; // Align to next byte
      } else {
        this.data[this.position - 1] = this.currentByte; // Align to last byte
      }
    }
    this.remainingBits = 0;
    this.currentByte = null;
    return this;
  }

  /**
   * Checks if all data in the buffer has been read.
   * @returns {boolean} True if all data has been read, false otherwise.
   */
  isComplete() {
    return this.remainingBits === 0 && this.position >= this.data.length;
  }

  /**
   * Returns a copy of the buffer's contents up to the current position.
   * @returns {Uint8Array} The buffer contents.
   */
  getBuffer() {
    this.alignToByte(true);
    return this.data.slice(0, this.position);
  }

  /**
   * Clears the buffer and resets all internal state.
   * @returns {BitPackedBuffer} This buffer instance for chaining.
   */
  clear() {
    this.data = new Uint8Array();
    this.position = 0;
    this.currentByte = null;
    this.remainingBits = 0;
    this.marks.clear();
    return this;
  }
}
