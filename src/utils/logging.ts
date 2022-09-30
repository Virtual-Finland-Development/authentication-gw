import Settings from "./Settings";

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
      } else {
        debugMessages.push(message);
      }
    }
    log("DEBUG", ...debugMessages);
  }
}

// @see: https://axios-http.com/docs/handling_errors
export function logAxiosException(error: any) {
  log("Logging axios exception..");
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    log(error.response.data);
    log(error.response.status);
    log(error.response.headers);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    log(error.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    log("Error", error.message);
  }
  log(error.config);
}
