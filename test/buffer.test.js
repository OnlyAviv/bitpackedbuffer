import test from "node:test";
import assert from "node:assert/strict";
import { BitPackedBuffer } from "../src/buffer.js";

test("BitPackedBuffer", async (t) => {
  await t.test("constructor", async (t) => {
    await t.test("default parameters", (t) => {
      const buffer = new BitPackedBuffer();
      assert.equal(buffer.position, 0);
      assert.equal(buffer.remainingBits, 0);
      assert.equal(buffer.currentByte, 0);
      assert.equal(buffer.isBigEndian, true);
      assert.equal(buffer.data.length, 0);
    });

    await t.test("with initial contents", (t) => {
      const initial = new Uint8Array([1, 2, 3]);
      const buffer = new BitPackedBuffer(initial);
      assert.deepEqual(buffer.data, initial);
    });

    await t.test("with Buffer contents", (t) => {
      const initial = Buffer.from([1, 2, 3]);
      const buffer = new BitPackedBuffer(initial);
      assert.deepEqual(buffer.data, new Uint8Array([1, 2, 3]));
    });

    await t.test("with endianness", (t) => {
      const bufferBig = new BitPackedBuffer(undefined, "big");
      const bufferLittle = new BitPackedBuffer(undefined, "little");
      assert.equal(bufferBig.isBigEndian, true);
      assert.equal(bufferLittle.isBigEndian, false);
    });
  });

  await t.test("bit operations", async (t) => {
    await t.test("reading bits", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([0b10101010]));

      await t.test("single bit", (t) => {
        assert.equal(buffer.read.bits(1), 1);
        assert.equal(buffer.read.bits(1), 0);
      });

      await t.test("multiple bits", (t) => {
        buffer.seek(0);
        assert.equal(buffer.read.bits(3), 0b101);
      });

      await t.test("across byte boundary (big endian)", (t) => {
        const buf = new BitPackedBuffer(new Uint8Array([0xff, 0x00]));
        assert.equal(buf.read.bits(12), 0xff0);
      });

      await t.test("across byte boundary (little endian)", (t) => {
        const buf = new BitPackedBuffer(new Uint8Array([0xff, 0x00]), "little");
        // 1111|11110000 gets expands to 00001111|11110000
        // which than gets reversed to  11110000|00001111
        assert.equal(buf.read.bits(12), 0xf00f);
      });

      await t.test("error conditions", (t) => {
        assert.throws(() => buffer.read.bits(0), RangeError);
        assert.throws(() => buffer.read.bits(33), RangeError);
        assert.throws(() => buffer.read.bits(-1), RangeError);
      });
    });

    await t.test("writing bits", async (t) => {
      const buffer = new BitPackedBuffer();

      await t.test("single bit", (t) => {
        buffer.write.bits(1, 1);
        buffer.seek(0);
        assert.equal(buffer.peek.bits(1), 1);
      });

      await t.test("multiple bits", (t) => {
        buffer.clear();
        buffer.write.bits(0b101, 3);
        buffer.seek(0);
        assert.equal(buffer.peek.bits(3), 0b101);
      });

      await t.test("across byte boundary", (t) => {
        buffer.clear();
        buffer.write.bits(0xff0, 12);
        buffer.seek(0);

        assert.equal(buffer.peek.bits(12), 0xff0);
      });

      await t.test("error conditions", (t) => {
        assert.throws(() => buffer.write.bits(0, 0), RangeError);
        assert.throws(() => buffer.write.bits(0, 33), RangeError);
        assert.throws(() => buffer.write.bits(0, -1), RangeError);
      });
    });
  });

  await t.test("byte operations", async (t) => {
    await t.test("reading bytes", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3, 4]));

      await t.test("single byte", (t) => {
        assert.deepEqual(buffer.read.bytes(1), new Uint8Array([1]));
      });

      await t.test("multiple bytes", (t) => {
        buffer.seek(0);
        assert.deepEqual(buffer.read.bytes(2), new Uint8Array([1, 2]));
      });

      await t.test("error conditions", (t) => {
        assert.throws(() => buffer.read.bytes(5), RangeError);
      });
    });

    await t.test("writing bytes", async (t) => {
      const buffer = new BitPackedBuffer();

      await t.test("single byte", (t) => {
        buffer.write.bytes(new Uint8Array([1]));
        buffer.seek(0);
        assert.deepEqual(buffer.peek.bytes(1), new Uint8Array([1]));
      });

      await t.test("multiple bytes", (t) => {
        buffer.clear();
        buffer.write.bytes(new Uint8Array([1, 2]));
        buffer.seek(0);
        assert.deepEqual(buffer.peek.bytes(2), new Uint8Array([1, 2]));
      });
    });
  });

  await t.test("string operations", async (t) => {
    await t.test("reading strings", async (t) => {
      const text = "Hello, World!";
      const buffer = new BitPackedBuffer();
      buffer.write.string(text);
      buffer.seek(0);

      await t.test("fixed length", (t) => {
        assert.equal(buffer.read.string(text.length), text);
      });

      await t.test("null-terminated", (t) => {
        buffer.seek(0);
        buffer.write.cString(text);
        buffer.seek(0);
        assert.equal(buffer.read.cString(), text);
      });
    });

    await t.test("writing strings", async (t) => {
      const buffer = new BitPackedBuffer();

      await t.test("basic string", (t) => {
        const text = "Hello";
        buffer.write.string(text);
        buffer.seek(0);
        assert.equal(buffer.read.string(text.length), text);
      });

      await t.test("null-terminated string", (t) => {
        buffer.clear();
        const text = "World";
        buffer.write.cString(text);
        buffer.seek(0);
        assert.equal(buffer.read.cString(), text);
      });
    });
  });

  await t.test("integer operations", async (t) => {
    await t.test("reading integers", async (t) => {
      const buffer = new BitPackedBuffer();

      await t.test("unsigned integers", (t) => {
        buffer.write.uint(255, 8);
        buffer.seek(0);
        assert.equal(buffer.read.uint(8), 255);
      });

      await t.test("signed integers", (t) => {
        buffer.clear();
        buffer.write.int(-128, 8);
        buffer.seek(0);
        assert.equal(buffer.read.int(8), -128);
      });

      await t.test("large integers", (t) => {
        buffer.clear();
        buffer.write.uint(0xffffffff, 32);
        buffer.seek(0);
        assert.equal(buffer.read.uint(32), 0xffffffff);
      });
    });

    await t.test("writing integers", async (t) => {
      const buffer = new BitPackedBuffer();

      await t.test("unsigned integers", (t) => {
        buffer.write.uint(42, 8);
        buffer.seek(0);
        assert.equal(buffer.read.uint(8), 42);
      });

      await t.test("signed integers", (t) => {
        buffer.clear();
        buffer.write.int(-42, 8);
        buffer.seek(0);
        assert.equal(buffer.read.int(8), -42);
      });
    });
  });

  await t.test("buffer operations", async (t) => {
    await t.test("seeking", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3]));

      await t.test("seek forward", (t) => {
        buffer.seek(2);
        assert.equal(buffer.position, 2);
      });

      await t.test("seek to start", (t) => {
        buffer.seek(0);
        assert.equal(buffer.position, 0);
      });

      await t.test("error conditions", (t) => {
        assert.throws(() => buffer.seek(-1), RangeError);
      });
    });

    await t.test("skipping", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3]));

      await t.test("skip forward", (t) => {
        buffer.skip(2);
        assert.equal(buffer.position, 2);
      });

      await t.test("skip to end", (t) => {
        buffer.skip(1);
        assert.equal(buffer.position, 3);
      });
    });

    await t.test("marks and reset", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3]));

      await t.test("default mark", (t) => {
        buffer.mark();
        buffer.skip(2);
        buffer.reset();
        assert.equal(buffer.position, 0);
      });

      await t.test("named mark", (t) => {
        buffer.mark("test");
        buffer.skip(2);
        buffer.reset("test");
        assert.equal(buffer.position, 0);
      });

      await t.test("error conditions", (t) => {
        assert.throws(() => buffer.reset("nonexistent"), Error);
      });
    });

    await t.test("peek operations", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3]));

      await t.test("peek bits", (t) => {
        const pos = buffer.position;
        const value = buffer.peek.bits(8);
        assert.equal(value, 1);
        assert.equal(buffer.position, pos);
      });

      await t.test("peek bytes", (t) => {
        const pos = buffer.position;
        const value = buffer.peek.bytes(2);
        assert.deepEqual(value, new Uint8Array([1, 2]));
        assert.equal(buffer.position, pos);
      });
    });

    await t.test("buffer state", async (t) => {
      const buffer = new BitPackedBuffer(new Uint8Array([1, 2, 3]));

      await t.test("isComplete", (t) => {
        assert.equal(buffer.isComplete(), false);
        buffer.seek(3);
        assert.equal(buffer.isComplete(), true);
      });

      await t.test("getBuffer", (t) => {
        buffer.seek(0);
        buffer.write.bits(0xff, 8);
        assert.deepEqual(buffer.getBuffer(), new Uint8Array([0xff]));
      });

      await t.test("clear", (t) => {
        buffer.clear();
        assert.equal(buffer.position, 0);
        assert.equal(buffer.data.length, 0);
      });
    });

    await t.test("endianness", async (t) => {
      await t.test("big endian", (t) => {
        const buffer = new BitPackedBuffer(undefined, "big");
        buffer.write.uint(0x1234, 16);
        buffer.seek(0);
        assert.equal(buffer.peek.uint(16), 0x1234);
        buffer.isBigEndian = false;
        assert.equal(buffer.read.uint(16), 0x3412);
      });

      await t.test("little endian", (t) => {
        console.log("start");
        const buffer = new BitPackedBuffer(undefined, "little");
        buffer.write.uint(0x1234, 16);
        buffer.seek(0);
        assert.equal(buffer.peek.uint(16), 0x1234);
        buffer.isBigEndian = true;
        assert.equal(buffer.read.uint(16), 0x3412);
      });
    });
  });
});
