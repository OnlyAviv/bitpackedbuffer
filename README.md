# BitPackedBuffer

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/bitpacked.svg)](https://www.npmjs.com/package/bitpacked)

A zero-dependency JavaScript library for efficient bit-level data manipulation, supporting both little-endian and big-endian byte orders.

## Why BitPackedBuffer?

- 🚀 **Lightweight**: Zero dependencies, minimal overhead
- 🔧 **Flexible**: Support for both little-endian and big-endian byte orders
- 💪 **Powerful**: Read and write at both bit and byte levels
- 🎯 **Precise**: Efficient bit-level operations with position control
- 🔄 **Chainable**: Clean, fluent API for consecutive operations
- 📦 **Modern**: Full ES Module support

## Installation

```bash
npm install bitpacked
```

## Quick Start

```javascript
import { BitPackedBuffer } from "bitpacked";

// Create a buffer and write some data
const buffer = new BitPackedBuffer()
  .writeBits(5, 3) // Write value 5 using 3 bits
  .writeBits(10, 4) // Write value 10 using 4 bits
  .alignToByte(); // Align to byte boundary

// Read the data back
buffer.seek(0);
console.log(buffer.readBits(3)); // → 5
console.log(buffer.readBits(4)); // → 10
```

## Key Features

### Reading Operations

```javascript
const buffer = new BitPackedBuffer(existingData);

// Read bits without moving position
const peekedValue = buffer.peek(4);

// Read and advance position
const value = buffer.readBits(3);
const bytes = buffer.readBytes(2);
```

### Writing Operations

```javascript
const buffer = new BitPackedBuffer();

// Chain multiple writes
buffer
  .writeBits(7, 4) // Write 7 using 4 bits
  .writeBytes([1, 2]) // Write byte array
  .alignToByte(); // Align to byte boundary
```

### Position Management

```javascript
buffer
  .mark("start") // Mark current position
  .writeBits(12, 5) // Write some bits
  .reset("start"); // Return to marked position
```

## Advanced Usage

### Working with Different Endianness

```javascript
// Create little-endian buffer
const buffer = new BitPackedBuffer(null, "little");

// Write and read multi-byte values
buffer.writeBits(1000, 16);
buffer.seek(0);
console.log(buffer.readBits(16)); // → 1000
```

### Buffer Management

```javascript
// Get underlying buffer
const rawBuffer = buffer.getBuffer();

// Check if all data has been read
const isComplete = buffer.isComplete();

// Clear buffer state
buffer.clear();
```

## API Reference

### Constructor

```typescript
new BitPackedBuffer(
  contents?: Uint8Array | Buffer,
  endian?: 'big' | 'little'
)
```

By default, a `BitPackedBuffer` is Big-Endian.

### Core Methods

| Method                                       | Description                          |
| -------------------------------------------- | ------------------------------------ |
| `readBits(bitCount: number)`                 | Read up to 32 bits                   |
| `writeBits(value: number, bitCount: number)` | Write up to 32 bits                  |
| `readBytes(count: number)`                   | Read multiple bytes                  |
| `writeBytes(bytes: Uint8Array \| Buffer)`    | Write multiple bytes                 |
| `peek(bitCount: number)`                     | Read bits without advancing position |
| `seek(position: number)`                     | Move to specific bit position        |
| `mark(name?: string)`                        | Mark current position                |
| `reset(name?: string)`                       | Return to marked position            |
| `alignToByte()`                              | Align to next byte boundary          |
| `getBuffer()`                                | Get buffer contents                  |
| `clear()`                                    | Reset buffer state                   |

## Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📦 [NPM Package](https://www.npmjs.com/package/bitpacked)
- 📖 [GitHub Repository](https://github.com/RedYetiDev/bitpackedbuffer)
- 🐛 [Issue Tracker](https://github.com/RedYetiDev/bitpackedbuffer/issues)

---

Made with ❤️ by [RedYetiDev](https://github.com/RedYetiDev)
