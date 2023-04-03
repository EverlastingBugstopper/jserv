#!/usr/bin/env node

const { program } = require("commander");
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
	console.error(`error: ${message}`);
}

function withContext(message, error) {
	return `${message}\n  caused by: ${error}`;
}

// let's have some fun with go style error handling because i don't know what i'm doing
function getJsonFromPath(path) {
	try {
		let contents = fs.readFileSync(path, { encoding: "utf8" });

		try {
			return [JSON.stringify(JSON.parse(contents)), null];
		} catch (e) {
			return [null, withContext(`file "${path}" is not valid JSON`, e)];
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
			console.log(`serving ${jsonPath} at all endpoints under ${endpoint}`);
			console.log(`watching ${jsonPath} for changes...`);
			fs.watch(jsonPath, { encoding: "utf8" }, (event, filename) => {
				let [reloadedJson, reloadedError] = getJsonFromPath(jsonPath);

				// if the new path is invalid JSON and the error hasn't been reported already,
				// update the server to return the error and print that the server is misconfigured
				if (reloadedError !== null && reloadedError !== serverError) {
					json = null;
					serverError = reloadedError;
					printError(
						withContext(
							`the change to ${jsonPath} was not valid`,
							reloadedError
						)
					);
					// if the new path is valid JSON and it's not the same JSON as before
					// clear out the server errors, start returning the new JSON, and print that the change has been applied
				} else if (reloadedJson !== null && reloadedJson !== json) {
					json = reloadedJson;
					serverError = null;
					console.log(`applied changes to "${jsonPath}" to the server`);
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
