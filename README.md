# BitPackedBuffer

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/bitpacked.svg)](https://www.npmjs.com/package/bitpacked)

A high-performance JavaScript library for bit-level data manipulation with zero dependencies. Perfect for binary protocols, file formats, and low-level data operations.

## Overview

BitPackedBuffer provides precise control over bit-level operations in JavaScript, supporting both big-endian and little-endian byte orders. Whether you're implementing a binary protocol, working with compressed data, or handling custom file formats, BitPackedBuffer offers a clean, chainable API for all your bit manipulation needs.

### Key Features

- 🚀 Zero dependencies, minimal overhead
- 💫 Bit-level precision (1-32 bits)
- 🔄 Big and little-endian support
- 📦 Modern ES Module design
- ⚡ Efficient memory usage
- 🛡️ Comprehensive error checking

## Installation

```bash
npm install bitpacked
```

## Quick Examples

### Basic Usage

<!-- prettier-ignore -->
```javascript
import { BitPackedBuffer } from 'bitpacked';

// Write mixed-width values
const buffer = new BitPackedBuffer()
  .write.bits(5, 3) // Write value 5 using 3 bits
  .write.bits(10, 4) // Write value 10 using 4 bits
  .write.string('Hi') // Write a string
  .alignToByte(); // Align to byte boundary

// Read them back
buffer.seek(0);
console.log(buffer.read.bits(3)); // → 5
console.log(buffer.read.bits(4)); // → 10
console.log(buffer.read.string(2)); // → "Hi"
```

### Working with Endianness

```javascript
// Create a little-endian buffer
const buffer = new BitPackedBuffer(null, "little");

// Write a 16-bit value
buffer.write.bits(1000, 16);

// Read it back
buffer.seek(0);
console.log(buffer.read.bits(16)); // → 1000
```

## API Reference

### Constructor

```typescript
new BitPackedBuffer(
  contents?: Uint8Array | Buffer,
  endian?: 'big' | 'little'
)
```

### Reading Operations

| Method                | Description                 | Example                  |
| --------------------- | --------------------------- | ------------------------ |
| `read.bits(count)`    | Read 1-32 bits              | `buffer.read.bits(5)`    |
| `read.bytes(count)`   | Read multiple bytes         | `buffer.read.bytes(4)`   |
| `read.string(length)` | Read fixed-length string    | `buffer.read.string(10)` |
| `read.cString()`      | Read null-terminated string | `buffer.read.cString()`  |
| `read.int(bitCount)`  | Read signed integer         | `buffer.read.int(16)`    |
| `read.uint(bitCount)` | Read unsigned integer       | `buffer.read.uint(16)`   |

### Writing Operations

| Method                        | Description                  | Example                         |
| ----------------------------- | ---------------------------- | ------------------------------- |
| `write.bits(value, count)`    | Write 1-32 bits              | `buffer.write.bits(42, 7)`      |
| `write.bytes(data)`           | Write byte array             | `buffer.write.bytes(bytes)`     |
| `write.string(str)`           | Write string                 | `buffer.write.string("hello")`  |
| `write.cString(str)`          | Write null-terminated string | `buffer.write.cString("hello")` |
| `write.int(value, bitCount)`  | Write signed integer         | `buffer.write.int(-42, 16)`     |
| `write.uint(value, bitCount)` | Write unsigned integer       | `buffer.write.uint(42, 16)`     |

### Buffer Management

| Method           | Description               |
| ---------------- | ------------------------- |
| `seek(position)` | Move to byte position     |
| `skip(bytes)`    | Skip ahead bytes          |
| `mark(name?)`    | Mark current position     |
| `reset(name?)`   | Return to marked position |
| `alignToByte()`  | Align to byte boundary    |
| `clear()`        | Reset buffer state        |
| `getBuffer()`    | Get underlying buffer     |
| `isComplete()`   | Check if all data read    |

## Common Use Cases

- Binary file format parsing/writing
- Network protocol implementation
- Data compression/decompression
- Game state serialization
- Embedded systems communication

## Error Handling

BitPackedBuffer includes comprehensive error checking:

```javascript
try {
  buffer.read.bits(33); // Throws RangeError
} catch (error) {
  console.error("Invalid bit count:", error.message);
}
```

## Performance Considerations

- Align to byte boundaries when possible for better performance
- Use `mark()`/`reset()` for temporary position changes
- Pre-allocate buffers when size is known
- Use the appropriate endianness for your data format

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and commit: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

Please ensure your PR:

- Includes tests for new functionality
- Updates documentation as needed
- Follows the existing code style
- Includes a clear description of changes

## Support

- 📦 [npm package](https://www.npmjs.com/package/bitpacked)
- 📘 [GitHub Repository](https://github.com/RedYetiDev/bitpackedbuffer)
- 🐛 [Issue Tracker](https://github.com/RedYetiDev/bitpackedbuffer/issues)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [RedYetiDev](https://github.com/RedYetiDev)
