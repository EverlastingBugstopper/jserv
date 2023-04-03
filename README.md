# `jserv`

`jserv` is a development server for a single JSON file.

## Usage

**Serve a single json file from all endpoints:**

`npx jserv ./data.json`

Changes made to the file will be reloaded and served.

**Customize the host/port of the server:**

`npx jserv --port 4000 --host localhost ./data.json`
