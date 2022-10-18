import LoginApp from "./LoginApp";

export default async function LoginEventListener(loginApp: LoginApp) {
  const urlParams = new URLSearchParams(window.location.search);

  const affectsThisApp = urlParams.has("provider") && urlParams.get("provider").toLowerCase() === loginApp.getName().toLowerCase();
  if (!loginApp.AuthState.isLoggedIn()) {
    if (affectsThisApp && urlParams.has("loginCode")) {
      loginApp.log("LoginFlowEventsListener", "Login code received, fetching auth token..");
      //
      // Handle login response
      //
      const loginCode = urlParams.get("loginCode");
      try {
        const tokens = await loginApp.AuthService.fetchAuthTokens(loginCode);
        loginApp.AuthState.login(tokens); // Store token in local storage
        await loginApp.AuthState.handleLoggedIn(); // Fetch user info
        loginApp.UIState.resetViewState(); // reset view state
      } catch (error) {
        loginApp.log("LoginFlowEventsListener", "Failed to fetch auth token", error);
      }
    } else {
      loginApp.UIState.handleCurrentState(); // Init UI
    }
  } else if (affectsThisApp && urlParams.has("logout")) {
    loginApp.log("LoginFlowEventsListener", "Logout event received, logging out");
    //
    // Handle logout response
    //
    const logoutResponse = urlParams.get("logout");
    if (logoutResponse === "success") {
      loginApp.AuthState.logout();
      loginApp.UIState.resetViewState(); // reset view state
    }
  } else {
    //
    // Handle idle state
    //
    await loginApp.AuthState.handleLoggedIn(); // Validate login
    loginApp.UIState.handleCurrentState(); // Update UI
  }
}
