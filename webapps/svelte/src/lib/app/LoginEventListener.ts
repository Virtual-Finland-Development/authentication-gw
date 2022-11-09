import LoginApp from "./LoginApp";

export default async function LoginEventListener(loginApp: LoginApp) {
  const urlParams = new URLSearchParams(window.location.search);

  const affectsThisApp = urlParams.has("provider") && urlParams.get("provider").toLowerCase() === loginApp.getName().toLowerCase();
  if (!loginApp.AuthState.isLoggedIn()) {
    if (affectsThisApp && urlParams.has("loginCode")) {
      loginApp.log("LoginEventListener", "Login code received, fetching auth token..");
      //
      // Handle login response
      //
      const loginCode = urlParams.get("loginCode");
      try {
        const loggedInState = await loginApp.AuthService.fetchLoggedInState(loginCode);
        loginApp.AuthState.login(loggedInState); // Store state in local storage
        await loginApp.handleLoggedIn(); // Fetch user info
        loginApp.UIState.resetViewState("auth"); // reset view state
      } catch (error) {
        loginApp.log("LoginEventListener", "Failed to fetch auth token", error);
      }
    } else {
      loginApp.UIState.handleCurrentState(); // Init UI
    }
  } else if (affectsThisApp && urlParams.has("logout")) {
    loginApp.log("LoginEventListener", "Logout event received, logging out");
    //
    // Handle logout response
    //
    const logoutResponse = urlParams.get("logout");
    if (logoutResponse === "success") {
      loginApp.AuthState.logout();
      loginApp.UIState.resetViewState("auth"); // reset view state
    }
  } else {
    //
    // Handle logged-in state
    //
    await loginApp.handleLoggedIn(); // Validate login
    loginApp.UIState.handleCurrentState(); // Update UI
  }
}
