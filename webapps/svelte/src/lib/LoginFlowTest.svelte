<script>
import { onMount } from 'svelte';
import LoginApp from './app/LoginApp';
export let loginFlow = undefined;

const loginApp = new LoginApp({
  name: loginFlow.name,
  protocol: loginFlow.protocol,
});

let initialized = false; // a svelte reactivity hack

onMount(async () => {
  await loginApp.engage()
  initialized = true
})

let states = loginApp.UIState.states;

</script>

<div class="login-flow-box">
  {#if !initialized}
    <div class="login-state-box">
      <b>{loginFlow.name}</b> <br/>
      <p style="color: ocean">Initializing...</p>
  </div>
  {:else}
    <div id="{loginFlow.name}">
      <div class="login-state-box">
          <b>{loginFlow.name}</b> <br/>
          <span class="label">State:</span> <span class="{states.info.textStyleClass}">{states.info.text}</span>
          {#if loginApp.ifHasFeature('consents')}
            {#if loginApp.ConsentState.hasConsents()}
              <div class="consents">
                {#each loginApp.ConsentState.getConsentIds() as consentId}
                  <div class="consent">
                    <span class="label">Consent:</span> <span>{consentId}</span>
                    <span>:::</span>
                    <button class="is-small is-special" on:click="{() => loginApp.ConsentService.verifyConsentId(consentId)}">Verify</button>
                    <button class="is-small is-special" on:click="{() => loginApp.ConsentService.testConsentIdRequest(consentId)}">Test</button>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
      </div>
      <div>
          <button class="login" disabled="{states.login.disabled}" on:click="{() => loginApp.AuthService.login()}">Login</button>
          <button class="logout" disabled="{states.logout.disabled}" on:click="{() => loginApp.AuthService.logout()}">Logout</button>
          <span>:::</span>
          <button class="authorize is-special" disabled="{states.authorize.disabled}" on:click="{() => loginApp.AuthService.authorize()}">Authorize</button>
          {#if loginApp.ifHasFeature('consents')}
            <button class="consentify is-special" disabled="{states.consentify.disabled}" on:click="{() => loginApp.ConsentService.consentify()}">Check Consent</button>
          {/if}
      </div>
    </div>
  {/if}
</div>