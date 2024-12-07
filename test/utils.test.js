import { test } from "node:test";
import assert from "node:assert/strict";
import { swapEndianness } from "../src/utils.js";

test("le2be conversion", async (t) => {
  await t.test("16-bit conversion", () => {
    assert.equal(swapEndianness(0x1234, 2), 0x3412);
    assert.equal(swapEndianness(0xff00, 2), 0x00ff);
    assert.equal(swapEndianness(0x0055, 2), 0x5500);
  });

  await t.test("24-bit conversion", () => {
    assert.equal(swapEndianness(0x123456, 3), 0x563412);
    assert.equal(swapEndianness(0xff0000, 3), 0x0000ff);
    assert.equal(swapEndianness(0x005500, 3), 0x005500);
  });

  await t.test("32-bit conversion", () => {
    assert.equal(swapEndianness(0x12345678, 4), 0x78563412);
    assert.equal(swapEndianness(0xff000000, 4), 0x000000ff);
    assert.equal(swapEndianness(0x00550000, 4), 0x00005500);
    assert.equal(swapEndianness(0xffffffff, 4), 0xffffffff);
  });
});
