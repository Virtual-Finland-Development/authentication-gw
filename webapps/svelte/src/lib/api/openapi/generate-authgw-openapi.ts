import { default as AppSettings } from "../../../AppSettings.js";

import fs from "fs";
import * as OpenAPI from "openapi-typescript-codegen";
import path from "path";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = `${AppSettings.authenticationGatewayHost}/docs/openapi/authentication-gw.yml`;
const outputDir = `${__dirname}/generated`;

fs.rm(outputDir, { recursive: true, force: true }, (err) => {
  OpenAPI.generate({
    input: inputFile,
    output: outputDir,
    clientName: "AuthGWClient",
    useOptions: true,
  });
});
