<script>
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;
  export let message = "You need to be logged in to use this feature.";

  const dispatch = createEventDispatcher();

  function handleLogin() {
    dispatch("login");
    close();
  }

  function handleSignup() {
    dispatch("signup");
    close();
  }

  function close() {
    isOpen = false;
    dispatch("close");
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      close();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick} role="dialog" aria-modal="true">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Login Required</h2>
        <button class="close-button" on:click={close} aria-label="Close">
          &times;
        </button>
      </div>

      <div class="modal-body">
        <div class="icon">🔒</div>
        <p class="message">{message}</p>
        <p class="submessage">Please log in or create an account to continue.</p>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" on:click={handleLogin}>
          Log In
        </button>
        <button class="btn btn-secondary" on:click={handleSignup}>
          Sign Up
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    max-width: 450px;
    width: 100%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-button:hover {
    background-color: #f5f5f5;
    color: #333;
  }

  .modal-body {
    padding: 2rem 1.5rem;
    text-align: center;
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .message {
    font-size: 1.1rem;
    font-weight: 500;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .submessage {
    font-size: 0.95rem;
    color: #6b7280;
    margin: 0;
  }

  .modal-footer {
    padding: 1.5rem;
    display: flex;
    gap: 0.75rem;
    border-top: 1px solid #e0e0e0;
  }

  .btn {
    flex: 1;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #4f46e5, #6366f1);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #4338ca, #4f46e5);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
  }

  .btn-primary:active {
    transform: translateY(0);
  }

  .btn-secondary {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .btn-secondary:hover {
    background-color: #e5e7eb;
    border-color: #9ca3af;
  }

  @media (max-width: 600px) {
    .modal-footer {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>
