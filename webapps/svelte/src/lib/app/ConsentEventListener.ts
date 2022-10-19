import LoginApp from "./LoginApp";

export default async function ConsentEventListener(loginApp: LoginApp) {
  if (loginApp.UIState.ifInTransition("consent")) {
    loginApp.UIState.setTransition("consent", false);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("status")) {
      const status = urlParams.get("status");
      if (status === "success") {
        loginApp.log("ConsentEventListener", "Consent success");
        await loginApp.ConsentService.resolveConsentToken();
      } else {
        loginApp.log("ConsentEventListener", "Consent failure");
      }
    } else {
      loginApp.log("ConsentEventListener", "Invalid consent response");
    }
  }
}
