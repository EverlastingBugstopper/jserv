#!/usr/bin/env node

const { program } = require("commander");
const lineColumn = require("line-column");
const { name, version, description } = require("./package.json");
const http = require("http");
const fs = require("fs");

const DEFAULT_PORT = "8080";
const DEFAULT_HOST = "127.0.0.1";

function bail(message) {
	printError(message);
	process.exit(1);
}

function printError(message) {
	console.error(`✖️ error: ${message}`);
}

function withContext(message, causedBy) {
	return `${message}\n  ☞ ${causedBy.message}`;
}

// let's have some fun with go style error handling because i don't know what i'm doing
function getJsonFromPath(path) {
	try {
		let contents = fs.readFileSync(path, { encoding: "utf8" });

		try {
			return [JSON.stringify(JSON.parse(contents)), null];
		} catch (e) {
			let message = `file "${path}" is not valid JSON`;

			let maybeFilePosition = e.message.split("position ");

			if (maybeFilePosition.length == 2) {
				let filePosition = maybeFilePosition[1];
				const calculatedLineColumn =
					lineColumn(contents).fromIndex(filePosition);
				if (
					calculatedLineColumn !== null &&
					calculatedLineColumn !== undefined
				) {
					const { line, col } = calculatedLineColumn;
					if (
						line !== null &&
						line !== undefined &&
						col !== null &&
						col !== undefined
					) {
						message = `invalid JSON at ${path}:${line}:${col}`;
					}
				}
			}

			return [null, withContext(message, e)];
		}
	} catch (e) {
		return [null, withContext(`could not read file "${path}"`, e)];
	}
}

program.name(name).description(description).version(version);

program
	.argument("<json>", "a path to a JSON file to serve at all endpoints")
	.option(
		"-p, --port <port>",
		"the port the server should listen on",
		DEFAULT_PORT
	)
	.option(
		"-h, --host <host>",
		"the host the server should listen on",
		DEFAULT_HOST
	)
	.action((jsonPath, options) => {
		if (fs.existsSync(jsonPath)) {
			let [json, serverError] = getJsonFromPath(jsonPath);
			if (serverError) {
				bail(serverError);
			}
			let endpoint = `http://${options.host}:${options.port}`;
			http
				.createServer((req, res) => {
					if (serverError === null) {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(json);
					} else {
						res.writeHead(500, { "Content-Type": "text/plain" });
						res.end(serverError);
					}
				})
				.listen(options.port, options.host);
			console.log(`${jsonPath} is available at ${endpoint}`);
			console.log(`watching JSON file for changes...`);
			fs.watch(jsonPath, { encoding: "utf8" }, (event, filename) => {
				let [reloadedJson, reloadedError] = getJsonFromPath(jsonPath);

				// if the new path is invalid JSON and the error hasn't been reported already,
				// update the server to return the error and print that the server is misconfigured
				if (reloadedError !== null && reloadedError !== serverError) {
					json = null;
					serverError = reloadedError;
					printError(reloadedError);
					// if the new path is valid JSON and it's not the same JSON as before
					// clear out the server errors, start returning the new JSON, and print that the change has been applied
				} else if (reloadedJson !== null && reloadedJson !== json) {
					json = reloadedJson;
					serverError = null;
					console.log("✔️ JSON reloaded");
				} else if (reloadedJson === null && reloadedError === null) {
					// the above states should have handled all possible occurrences
					// if we don't have a good response, something went wrong
					bail(`an unknown error occurred. this is a bug in ${name}.`);
				}
			});
		} else {
			// if the file provided to the CLI does not exist, bail early
			bail(`could not find a file at "${jsonPath}"`);
		}
	});

if (process.argv.length == 2) {
	program.outputHelp();
}

program.parse();
