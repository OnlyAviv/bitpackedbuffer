import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { BitPackedBuffer } from "../src/Buffer.js";

test("BitPackedBuffer", async (t) => {
  await t.test("constructor initializes correctly", async (t) => {
    await t.test("default constructor", () => {
      const buffer = new BitPackedBuffer();
      assert.equal(buffer.position, 0);
      assert.equal(buffer.remainingBits, 0);
      assert.equal(buffer.currentByte, null);
      assert.equal(buffer.isBigEndian, true);
    });

    await t.test("constructor with initial contents", () => {
      const initialContents = new Uint8Array([0xaa, 0xbb]);
      const buffer = new BitPackedBuffer(initialContents);
      assert.deepEqual(buffer.data, initialContents);
    });

    await t.test("constructor with endianness", () => {
      const bufferBig = new BitPackedBuffer(new Uint8Array(), "big");
      const bufferLittle = new BitPackedBuffer(new Uint8Array(), "little");
      assert.equal(bufferBig.isBigEndian, true);
      assert.equal(bufferLittle.isBigEndian, false);
    });
  });

  await t.test("position management", async (t) => {
    await t.test("seek works correctly", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa, 0xbb, 0xcc]));
      buffer.seek(1);
      assert.equal(buffer.position, 1);

      buffer.seek(0);
      assert.equal(buffer.position, 0);

      assert.throws(() => buffer.seek(-1), RangeError);
      buffer.seek(10);
      assert.equal(buffer.position, 10);
    });

    await t.test("skip works correctly", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa, 0xbb, 0xcc]));
      buffer.skip(1);
      assert.equal(buffer.position, 1);
      buffer.skip(2);
      assert.equal(buffer.position, 3);
    });

    await t.test("mark and reset work correctly", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa, 0xbb, 0xcc]));
      buffer.mark("test");
      buffer.seek(2);
      buffer.reset("test");
      assert.equal(buffer.position, 0);
    });
  });

  await t.test("bit writing and reading operations", async (t) => {
    await t.test("writes and reads bits, regardless of endian-ness", () => {
      for (const endian of ["little", "big"]) {
        const buffer = new BitPackedBuffer(null, endian);
        buffer.writeBits(0xf, 4); // Write 1111
        assert.equal(buffer.currentByte, 0b11110000);
        buffer.writeBits(0x3, 2); // Write 11
        assert.equal(buffer.currentByte, 0b11111100);
        buffer.seek(0);
        assert.deepEqual(buffer.data, new Uint8Array([0b11111100]));

        assert.equal(buffer.readBits(4), 0xf);
        assert.equal(buffer.readBits(2), 0x3);
      }
    });

    await t.test("handles bit overflow correctly (big-endian)", () => {
      const buffer = new BitPackedBuffer();
      buffer.writeBits(0xff, 8);
      buffer.writeBits(0x1, 1);
      buffer.seek(0);
      assert.deepEqual(buffer.data, new Uint8Array([0xff, 0b10000000]));

      // MSB --> LSB
      assert.equal(buffer.readBits(9), 0xff01);
    });

    await t.test("handles bit overflow correctly (little-endian)", () => {
      const buffer = new BitPackedBuffer(null, "little");
      buffer.writeBits(0xff, 8);
      buffer.writeBits(0x1, 1);
      buffer.seek(0);
      assert.deepEqual(buffer.data, new Uint8Array([0xff, 0b10000000]));

      // LSB --> MSB
      assert.equal(buffer.readBits(9), 0x1ff);
    });

    await t.test("handles reading across byte boundaries", () => {
      const buffer = new BitPackedBuffer();
      buffer.writeBits(0xf, 4); // Write 1111
      buffer.writeBits(0xab, 8); // Write 10101011
      buffer.seek(0);
      assert.equal(buffer.readBits(4), 0xf);
      assert.equal(buffer.readBits(8), 0xab);
    });

    await t.test("handles reading with insufficient data", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa]));
      buffer.seek(1);
      assert.throws(() => buffer.readBits(8), Error);
    });
  });

  await t.test("byte operations", async (t) => {
    await t.test("writes and reads bytes correctly", () => {
      const buffer = new BitPackedBuffer();
      const testData = new Uint8Array([0xaa, 0xbb, 0xcc]);
      buffer.writeBytes(testData);
      buffer.seek(0);
      const result = buffer.readBytes(3);
      assert.deepEqual(result, testData);
    });

    await t.test("handles Buffer input", () => {
      const buffer = new BitPackedBuffer();
      const testData = Buffer.from([0xaa, 0xbb, 0xcc]);
      buffer.writeBytes(testData);
      buffer.seek(0);
      const result = buffer.readBytes(3);
      assert.deepEqual(result, new Uint8Array(testData));
    });

    await t.test("handles writing across byte boundaries (big endian)", () => {
      const buffer = new BitPackedBuffer();
      buffer.writeBits(0xf, 4); // Write 1111
      buffer.writeBytes(new Uint8Array([0xab]));
      buffer.seek(0);
      assert.equal(buffer.readBits(4), 0xf);
      assert.deepEqual(buffer.readBytes(1), new Uint8Array([0xab]));
    });

    await t.test("handles reading with insufficient data", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa]));
      buffer.readBytes(1);
      assert.throws(() => buffer.readBytes(1), Error);
    });
  });

  await t.test("peeking operations", async (t) => {
    await t.test("peek bits works correctly", () => {
      const buffer = new BitPackedBuffer();
      buffer.writeBits(0xf, 4);
      buffer.seek(0);
      const peeked = buffer.peek(4);
      assert.equal(peeked, 0xf);
      assert.equal(buffer.position, 0); // Position shouldn't change
    });

    await t.test("peek bytes works correctly", () => {
      const buffer = new BitPackedBuffer();
      const testData = new Uint8Array([0xaa, 0xbb]);
      buffer.writeBytes(testData);
      buffer.seek(0);
      const peeked = buffer.peekBytes(2);
      assert.deepEqual(peeked, testData);
      assert.equal(buffer.position, 0); // Position shouldn't change
    });
  });

  await t.test("error handling", async (t) => {
    await t.test("throws on negative seek", () => {
      const buffer = new BitPackedBuffer();
      assert.throws(() => buffer.seek(-1), RangeError);
    });

    await t.test("throws on invalid bit count", () => {
      const buffer = new BitPackedBuffer();
      assert.throws(() => buffer.writeBits(0, 33), RangeError);
      assert.throws(() => buffer.readBits(33), RangeError);
    });

    await t.test("throws on buffer underrun", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa]));
      buffer.readBytes(1);
      assert.throws(() => buffer.readBytes(1), Error);
    });

    await t.test("throws on invalid input types", () => {
      const buffer = new BitPackedBuffer();
      assert.throws(() => buffer.writeBytes("not a buffer"), TypeError);
      assert.throws(() => buffer.writeBits("not a number", 8), TypeError);
    });
  });

  await t.test("utility methods", async (t) => {
    await t.test("clear resets buffer state", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa]));
      buffer.clear();
      assert.equal(buffer.position, 0);
      assert.equal(buffer.data.length, 0);
      assert.equal(buffer.remainingBits, 0);
    });

    await t.test("isComplete works correctly", () => {
      const buffer = new BitPackedBuffer(new Uint8Array([0xaa]));
      assert.equal(buffer.isComplete(), false);
      buffer.readBytes(1);
      assert.equal(buffer.isComplete(), true);
    });

    await t.test("getBuffer returns correct data", () => {
      const buffer = new BitPackedBuffer();
      const testData = new Uint8Array([0xaa, 0xbb]);
      buffer.writeBytes(testData);
      const result = buffer.getBuffer();
      assert.deepEqual(result, testData);
    });

    await t.test("alignToByte aligns correctly", () => {
      const buffer = new BitPackedBuffer();
      buffer.writeBits(0x1, 1); // Write single bit
      buffer.alignToByte(true);
      assert.equal(buffer.remainingBits, 0);
      assert.equal(buffer.currentByte, null);
    });
  });
});
