import LoginApp from "./LoginApp";

export default async function LoginEventListener(loginApp: LoginApp) {
  const urlParams = new URLSearchParams(window.location.search);
  const provider = urlParams.get("provider");
  const loginCode = urlParams.get("loginCode");
  const event = urlParams.get("event");
  const success = urlParams.get("success") === "true";
  const message = urlParams.get("message");
  const messageType = urlParams.get("type");

  const affectsThisApp = provider && provider.toLowerCase() === loginApp.getName().toLowerCase();

  if (affectsThisApp && (event === "login" || event === "logout")) {
    if (message && messageType) {
      loginApp.UIState.notify({ message, type: messageType });
    }
  }

  if (affectsThisApp && event === "logout") {
    //
    // Handle logout response
    //
    if (success) {
      loginApp.AuthState.logout();
    }
    loginApp.UIState.resetViewState("auth"); // reset view state
  } else if (!loginApp.AuthState.isLoggedIn()) {
    if (affectsThisApp && loginCode) {
      loginApp.log("LoginEventListener", "Logged-in code received, fetching auth state..");
      //
      // Handle login response
      //
      try {
        const loggedInState = await loginApp.AuthService.fetchLoggedInState(loginCode);
        loginApp.AuthState.login(loggedInState); // Store state in local storage
        await loginApp.handleLoggedIn(); // Fetch user info
      } catch (error) {
        loginApp.log("LoginEventListener", "Failed to fetch auth state", error);
      }
      loginApp.UIState.resetViewState("auth"); // reset view state
    } else {
      if (affectsThisApp && event === "login" && !success) {
        loginApp.UIState.resetViewState("auth"); // reset view state
      } else {
        loginApp.UIState.handleCurrentState(); // Init UI
      }
    }
  } else {
    //
    // Handle logged-in state
    //
    await loginApp.handleLoggedIn(true); // Validate login
    loginApp.UIState.handleCurrentState(); // Update UI
  }
}
