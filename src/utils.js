export function swapEndianness(value, numberOfBytes) {
  switch (numberOfBytes) {
    case 2: // 16-bit
      return (((value & 0xff) << 8) | ((value >>> 8) & 0xff)) >>> 0;

    case 3: // 24-bit
      return (
        (((value & 0xff) << 16) |
          (value & 0xff00) |
          ((value >>> 16) & 0xff)) >>>
        0
      );

    case 4: // 32-bit
      return (
        (((value & 0xff) << 24) |
          ((value & 0xff00) << 8) |
          ((value & 0xff0000) >>> 8) |
          ((value >>> 24) & 0xff)) >>>
        0
      );
  }

  throw new Error("UNREACHABLE");
}
