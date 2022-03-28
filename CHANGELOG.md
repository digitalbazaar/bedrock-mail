# bedrock-mail ChangeLog

## 3.1.0 - 2022-03-28

### Changed
- Update peer deps:
  - `bedrock@4.5`.
- Update internals to use esm style and use `esm.js` to
  transpile to CommonJS.

## 3.0.1 - 2021-05-06

### Changed
- Update `email-templates` dependency (was causing a 'cheerio not installed' error
  downstream).

## 3.0.0 - 2020-03-06

### Changed
- Update dependencies, modernize, and change everything.
- **BREAKING**: Switch to `nodemailer` and `email-templates`.
- **BREAKING**: Drop direct SWIG template support.
- **BREAKING**: Drop triggers.
- **BREAKING**: Change API.
  - Changed to async/await.
  - Can setup transport and verify at runtime.
  - See docs.
- Default to 'ejs' templates.
- Add logging options.
- Add main app override CLI options: --mail-{to,preview,send,log}.
- Add test program with transport debugging features.

## 2.0.4 - 2017-07-27

### Changed
- Update async dependency.
- Use child logger.

## 2.0.3 - 2016-07-27

### Fixed
- Ensure `text` is sent along with `html` and use proper content-type.

## 2.0.2 - 2016-07-27

### Fixed
- Use `html` key to retrieve parsed HTML, not `text`.

## 2.0.1 - 2016-03-15

### Changed
- Update bedrock dependencies.

## 2.0.0 - 2016-03-02

### Changed
- Update package dependencies for npm v3 compatibility.

## 1.0.1 - 2015-05-07

## 1.0.0 - 2015-04-08

### Changed
- Use `bedrock.start` event since no elevated privileges required.
- Simplify initialization and improve logging.

## 0.1.0 (up to early 2015)

- See git history for changes.
