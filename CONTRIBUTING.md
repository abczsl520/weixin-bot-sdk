# Contributing to weixin-bot-sdk

Thanks for your interest in contributing! 🎉

## How to Contribute

### Bug Reports

- Use GitHub Issues
- Include Node.js version, OS, and steps to reproduce
- Include error messages and stack traces

### Feature Requests

- Open an issue describing the feature
- Explain the use case

### Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes (`node examples/echo-bot.js`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Use ES modules (`import`/`export`)
- No external dependencies (keep it zero-dep)
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Testing

Currently we use manual testing with the examples. Automated tests are welcome!

```bash
# Run the echo bot example
node examples/echo-bot.js

# Run crypto unit tests
node --input-type=module -e "import './test/crypto.test.js'"
```

## Project Structure

```
src/
  index.js    - Entry point
  bot.js      - High-level WeixinBot class
  api.js      - Low-level HTTP API client
  cdn.js      - CDN upload/download
  crypto.js   - AES-128-ECB utilities
types/
  index.d.ts  - TypeScript declarations
examples/     - Usage examples
```

## Questions?

Open an issue or start a discussion. We're happy to help!
