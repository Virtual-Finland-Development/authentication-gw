<script>
  import LoginFlowTest from './lib/LoginFlowTest.svelte';
  export let loginFlows = [
    {
      name: "Sinuna",
      protocol: "openId",
    },
    {
      name: "SuomiFI",
      protocol: "saml2",
    }, 
    {
      name: "Testbed",
      protocol: "openId",
    }
  ]
</script>

<main>

  <h1>Virtual Finland Development</h1>
  <h2>Login flow examples / tests</h2>

  <div class="login-flows">
    {#each loginFlows as loginFlow, i}
      <LoginFlowTest {loginFlow} />
    {/each}
    <div class="login-flow-box">
      <div class="login-state-box">
        <b>Embedded authentication flow proto</b> <br/>
        <form action="/" target="loginIframe" id="loginTestForm">
          <input type="submit" value="Login">
        </form>
        <iframe title="Embedded authentication flow proto" name="loginIframe" id="loginIframe"></iframe>
    </div>
    </div>
  </div>

</main>

<style>
  #loginTestForm {
    display: none;
  }
  #loginIframe {
    min-width: 600px;
  }
</style>
