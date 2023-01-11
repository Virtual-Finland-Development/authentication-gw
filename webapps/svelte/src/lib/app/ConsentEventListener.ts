import LoginApp from "./LoginApp";

export default async function ConsentEventListener(loginApp: LoginApp) {
  if (loginApp.UIState.ifInTransition("consent")) {
    loginApp.UIState.setTransition("consent", false);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("consentStatus")) {
      const consentStatus = urlParams.get("consentStatus");
      if (consentStatus === "consentGranted") {
        loginApp.log("ConsentEventListener", "Consent success");
        await loginApp.ConsentService.consentify();
      } else {
        loginApp.log("ConsentEventListener", "Consent failure");
      }
    } else {
      loginApp.log("ConsentEventListener", "Invalid consent response");
    }
  }
}
