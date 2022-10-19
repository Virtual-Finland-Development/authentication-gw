import { AxiosError } from "axios";
import Settings from "./Settings";
import { exceptionToObject } from "./transformers";

export function log(...messages: Array<any>) {
  console.log(...messages);
}

export function debug(...messages: Array<any>) {
  if (Settings.getEnvironmentBoolean("DEBUG_MODE")) {
    const debugMessages = [];
    for (const message of messages) {
      if (typeof message === "function") {
        // lazy evaluation
        try {
          debugMessages.push(JSON.stringify(message()));
        } catch (error) {
          debugMessages.push("Failed to stringify debug message");
          debugMessages.push(error);
        }
      } else if (typeof message === "object" && message !== null) {
        debugMessages.push(JSON.stringify(message));
      } else if (message instanceof AxiosError) {
        const parts = logAxiosException(message, true);
        for (const part of parts) {
          debugMessages.push(part);
        }
      } else if (message instanceof Error) {
        debugMessages.push(exceptionToObject(message));
      } else {
        debugMessages.push(message);
      }
    }
    log("DEBUG", ...debugMessages);
  }
}

// @see: https://axios-http.com/docs/handling_errors
export function logAxiosException(error: any, disableLogOutput: boolean = false): Array<string> {
  const parts = [];
  parts.push("Logging axios exception..");
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    parts.push(JSON.stringify(error.response.data));
    parts.push(error.response.status);
    parts.push(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    parts.push(JSON.stringify(error.request));
  } else {
    // Something happened in setting up the request that triggered an Error
    parts.push("Error", error.message);
  }
  parts.push(error.config);

  if (!disableLogOutput) {
    for (const part of parts) {
      log(part);
    }
  }

  return parts;
}
