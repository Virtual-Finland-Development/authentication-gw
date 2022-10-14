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
  </div>

</main>

<style>
  
</style>
