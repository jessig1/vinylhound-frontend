<script>
  export let title = "Coming Soon";
  export let description = "This feature is on the roadmap. Stay tuned!";
</script>

<section class="placeholder">
  <h2>{title}</h2>
  <p>{description}</p>
</section>

<style>
  .placeholder {
    border-radius: 1.25rem;
    padding: 2.5rem 2rem;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 18px 42px rgba(79, 70, 229, 0.18);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .placeholder h2 {
    margin: 0;
    font-size: 1.75rem;
  }

  .placeholder p {
    margin: 0;
    font-size: 1rem;
    color: rgba(55, 65, 81, 0.85);
  }
</style>
