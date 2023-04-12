# `jserv`

`jserv` is a development server for a single JSON file.

The main reason to choose this package over a generic echo server is because it will parse your JSON file and print line and column numbers for any errors it encounters.

## Usage

**Serve a single json file from all endpoints:**

`npx jserv ./examples/data.json`

Changes made to the file will be reloaded and served.

**Customize the host/port of the server:**

`npx jserv --port 4000 --host localhost ./data.json`

## Example error

```sh
$ npx jserv@latest ./examples/bad.json

✖️ error: invalid JSON at ./examples/bad.json:3:28
  ☞ Unexpected token , in JSON at position 40
```
