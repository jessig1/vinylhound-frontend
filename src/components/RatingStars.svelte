<script>
  import { createEventDispatcher } from "svelte";

  export let max = 5;
  export let value = null;
  export let disabled = false;

  const dispatch = createEventDispatcher();

  function emit(next) {
    dispatch("change", { rating: next });
  }

  function handleSelect(targetValue) {
    if (disabled) {
      return;
    }
    const next = value === targetValue ? null : targetValue;
    emit(next);
  }

  function handleKeydown(event, targetValue) {
    if (disabled) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      handleSelect(targetValue);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const previous = targetValue - 1;
      emit(previous >= 1 ? previous : null);
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = targetValue + 1;
      emit(next <= max ? next : max);
    }
  }

  const items = Array.from({ length: max }, (_, index) => index + 1);
</script>

<div
  class="rating-stars"
  role="radiogroup"
  aria-disabled={disabled}
  aria-label="Album rating"
>
  {#each items as star (star)}
    <button
      type="button"
      class:active={value !== null && value >= star}
      class="rating-star"
      role="radio"
      aria-checked={value === star}
      aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
      on:click={() => handleSelect(star)}
      on:keydown={(event) => handleKeydown(event, star)}
      disabled={disabled}
    >
      <span aria-hidden="true">★</span>
    </button>
  {/each}
</div>

<style>
  .rating-stars {
    display: inline-flex;
    gap: 0.35rem;
  }

  .rating-star {
    appearance: none;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 1.6rem;
    line-height: 1;
    color: rgba(148, 163, 184, 0.8);
    transition: transform 0.15s ease, color 0.15s ease;
    padding: 0.1rem;
  }

  .rating-star:hover,
  .rating-star:focus-visible {
    color: #f59e0b;
    transform: translateY(-1px);
    outline: none;
  }

  .rating-star.active {
    color: #f59e0b;
  }

  .rating-star:disabled {
    cursor: not-allowed;
    color: rgba(148, 163, 184, 0.5);
    transform: none;
  }
</style>
