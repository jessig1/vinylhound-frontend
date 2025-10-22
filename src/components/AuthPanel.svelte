<script>
  import { createEventDispatcher } from "svelte";

  export let loading = false;

  const dispatch = createEventDispatcher();
  const signupPlaceholder = "Welcome to Vinyhound!\nMake your first playlist.";

  let mode = "login";
  let signupUsername = "";
  let signupPassword = "";
  let signupContent = "";
  let loginUsername = "demo";
  let loginPassword = "demo123";

  function submitSignup(event) {
    event.preventDefault();
    dispatch("signup", {
      username: signupUsername.trim(),
      password: signupPassword,
      content: signupContent,
    });
    mode = "login";
  }

  function submitLogin(event) {
    event.preventDefault();
    dispatch("login", {
      username: loginUsername.trim(),
      password: loginPassword,
    });
  }

  function showSignup(event) {
    event?.preventDefault?.();
    resetSignup();
    mode = "signup";
  }

  function showLogin(event) {
    event?.preventDefault?.();
    resetLogin();
    mode = "login";
  }

  export function resetSignup() {
    signupUsername = "";
    signupPassword = "";
    signupContent = "";
  }

  export function resetLogin() {
    loginPassword = "";
  }
</script>

<section class="auth-panel">
  {#if mode === "login"}
    <div class="panel">
      <h2>Log in to Vinyhound</h2>
      <form on:submit={submitLogin}>
        <label>
          Username
          <input
            type="text"
            bind:value={loginUsername}
            placeholder="demo"
            required
            autocomplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            bind:value={loginPassword}
            placeholder="demo123"
            required
            autocomplete="current-password"
          />
        </label>
        <button type="submit" disabled={loading}>Log in</button>
      </form>
      <p class="hint">
        Need an account?
        <button type="button" class="link" on:click={showSignup}>Sign up</button>
      </p>
      <p class="hint">Demo account: demo / demo123</p>
    </div>
  {:else}
    <div class="panel">
      <h2>Create your account</h2>
      <form on:submit={submitSignup}>
        <label>
          Username
          <input
            type="text"
            bind:value={signupUsername}
            placeholder="alice"
            required
            autocomplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            bind:value={signupPassword}
            required
            autocomplete="new-password"
          />
        </label>
        <label>
          Initial content <span class="hint">(one per line)</span>
          <textarea
            rows="4"
            bind:value={signupContent}
            placeholder={signupPlaceholder}
          ></textarea>
        </label>
        <button type="submit" disabled={loading}>Sign up</button>
      </form>
      <p class="hint">
        Already have an account?
        <button type="button" class="link" on:click={showLogin}>Log in</button>
      </p>
    </div>
  {/if}
</section>

<style>
  .auth-panel {
    max-width: 440px;
    margin: 0 auto;
  }

  .panel {
    background: #ffffff;
    border-radius: 1.25rem;
    padding: 2.25rem 2.25rem 2rem;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.6rem;
    color: #1f2937;
    text-align: center;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    font-weight: 600;
    color: #374151;
  }

  input,
  textarea {
    border-radius: 0.75rem;
    border: 1px solid rgba(79, 70, 229, 0.2);
    padding: 0.65rem 0.9rem;
    font-size: 0.95rem;
    font-family: inherit;
    background: rgba(255, 255, 255, 0.92);
  }

  textarea {
    resize: vertical;
    min-height: 140px;
  }

  button[type="submit"] {
    border: none;
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: #ffffff;
    border-radius: 999px;
    padding: 0.65rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  button[type="submit"]:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 30px rgba(99, 102, 241, 0.2);
  }

  button[type="submit"]:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .hint {
    margin: 0;
    text-align: center;
    color: rgba(55, 65, 81, 0.8);
    font-size: 0.9rem;
  }

  .link {
    background: none;
    border: none;
    color: #4f46e5;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
  }
</style>
