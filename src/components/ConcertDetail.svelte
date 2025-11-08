<script>
  import { createEventDispatcher } from "svelte";

  export let concert = null;

  const dispatch = createEventDispatcher();

  // Dummy data for other upcoming concerts at the same venue
  const upcomingConcertsAtVenue = [
    {
      id: 101,
      artistName: "Arctic Monkeys",
      name: "Tranquility Base Tour",
      date: new Date("2025-09-01T20:00:00"),
      ticketPrice: 120.0,
    },
    {
      id: 102,
      artistName: "The Strokes",
      name: "The New Abnormal Tour",
      date: new Date("2025-09-15T19:30:00"),
      ticketPrice: 135.0,
    },
    {
      id: 103,
      artistName: "Tame Impala",
      name: "Currents World Tour",
      date: new Date("2025-10-08T21:00:00"),
      ticketPrice: 145.0,
    },
  ];

  function handleBack() {
    dispatch("back");
  }

  function formatDate(date) {
    if (!date) return "Date TBA";
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  function formatTime(date) {
    if (!date) return "";
    const options = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  function formatPrice(price) {
    if (!price) return "Price TBA";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  }

  function formatShortDate(date) {
    if (!date) return "";
    const options = {
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }

  $: formattedDate = formatDate(concert?.date);
  $: formattedTime = formatTime(concert?.date);
  $: formattedPrice = formatPrice(concert?.ticketPrice);
  $: venueName = concert?.venue?.name || "Venue TBA";
  $: venueCity = concert?.venue?.city || "";
  $: venueState = concert?.venue?.state || "";
  $: venueLocation = venueCity && venueState ? `${venueCity}, ${venueState}` : "Location TBA";
</script>

{#if concert}
  <section class="concert-detail">
    <div class="concert-detail__actions">
      <button type="button" class="concert-detail__back" on:click={handleBack}>
        &lt; Back to artist
      </button>
    </div>

    <div class="concert-detail__hero">
      <div class="hero__badge">
        <svg
          class="hero__icon"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
          <path
            d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"
          />
        </svg>
      </div>
      <div class="hero__content">
        <h2 class="hero__title">{concert.name}</h2>
        <p class="hero__artist">{concert.artistName || "Artist TBA"}</p>
      </div>
    </div>

    <div class="concert-detail__info-grid">
      <div class="info-card">
        <div class="info-card__icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <div class="info-card__content">
          <h3>Date & Time</h3>
          <p class="info-card__primary">{formattedDate}</p>
          <p class="info-card__secondary">{formattedTime}</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card__icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div class="info-card__content">
          <h3>Venue</h3>
          <p class="info-card__primary">{venueName}</p>
          <p class="info-card__secondary">{venueLocation}</p>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card__icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div class="info-card__content">
          <h3>Price</h3>
          <p class="info-card__primary">{formattedPrice}</p>
          <p class="info-card__secondary">per ticket</p>
        </div>
      </div>
    </div>

    {#if concert.notes}
      <section class="concert-detail__notes">
        <h3>Notes</h3>
        <p>{concert.notes}</p>
      </section>
    {/if}

    <section class="concert-detail__upcoming">
      <header>
        <h3>Other Upcoming Shows at {venueName}</h3>
        <p>Don't miss these performances at the same venue</p>
      </header>
      <ul class="upcoming-list">
        {#each upcomingConcertsAtVenue as upcomingConcert (upcomingConcert.id)}
          <li class="upcoming-card">
            <div class="upcoming-card__date">
              <span class="date__month"
                >{upcomingConcert.date.toLocaleDateString("en-US", {
                  month: "short",
                })}</span
              >
              <span class="date__day"
                >{upcomingConcert.date.toLocaleDateString("en-US", {
                  day: "numeric",
                })}</span
              >
            </div>
            <div class="upcoming-card__info">
              <h4>{upcomingConcert.artistName}</h4>
              <p class="upcoming-card__name">{upcomingConcert.name}</p>
              <p class="upcoming-card__time">{formatTime(upcomingConcert.date)}</p>
            </div>
            <div class="upcoming-card__price">
              {formatPrice(upcomingConcert.ticketPrice)}
            </div>
          </li>
        {/each}
      </ul>
    </section>

    <div class="concert-detail__actions-bottom">
      <button type="button" class="btn btn--primary">Get Tickets</button>
      <button type="button" class="btn btn--secondary">Add to Calendar</button>
    </div>
  </section>
{:else}
  <section class="concert-detail concert-detail--empty">
    <p>No concert selected.</p>
    <button type="button" class="concert-detail__back" on:click={handleBack}>
      Back to artist
    </button>
  </section>
{/if}

<style>
  .concert-detail {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 1.5rem;
    padding: 2.5rem;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.12);
  }

  .concert-detail__actions {
    display: flex;
    justify-content: flex-start;
  }

  .concert-detail__back {
    border: none;
    border-radius: 0.75rem;
    padding: 0.65rem 1.25rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(79, 70, 229, 0.12);
    color: #312e81;
  }

  .concert-detail__back:hover,
  .concert-detail__back:focus-visible {
    background: rgba(79, 70, 229, 0.22);
    outline: none;
    transform: translateX(-2px);
  }

  .concert-detail__hero {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 1.25rem;
    color: #ffffff;
    box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);
  }

  .hero__badge {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    backdrop-filter: blur(10px);
  }

  .hero__icon {
    color: #ffffff;
  }

  .hero__content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hero__title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: #ffffff;
  }

  .hero__artist {
    margin: 0;
    font-size: 1.25rem;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }

  .concert-detail__info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    display: flex;
    gap: 1.25rem;
    padding: 1.75rem;
    background: rgba(241, 245, 249, 0.8);
    border-radius: 1rem;
    border: 1px solid rgba(148, 163, 184, 0.2);
    transition: all 0.2s ease;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.1);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .info-card__icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 0.75rem;
    color: #ffffff;
  }

  .info-card__content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .info-card__content h3 {
    margin: 0;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(55, 65, 81, 0.7);
    font-weight: 600;
  }

  .info-card__primary {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1f2937;
  }

  .info-card__secondary {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(55, 65, 81, 0.75);
  }

  .concert-detail__notes {
    padding: 1.75rem;
    background: rgba(245, 158, 11, 0.1);
    border-radius: 1rem;
    border-left: 4px solid #f59e0b;
  }

  .concert-detail__notes h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #92400e;
    font-weight: 700;
  }

  .concert-detail__notes p {
    margin: 0;
    color: #78350f;
    line-height: 1.6;
  }

  .concert-detail__upcoming {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
    border-radius: 1.25rem;
    border: 1px solid rgba(99, 102, 241, 0.15);
  }

  .concert-detail__upcoming header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .concert-detail__upcoming header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: #312e81;
    font-weight: 700;
  }

  .concert-detail__upcoming header p {
    margin: 0;
    color: rgba(55, 65, 81, 0.75);
  }

  .upcoming-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .upcoming-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1.5rem;
    align-items: center;
    padding: 1.25rem;
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
    border: 1px solid rgba(148, 163, 184, 0.1);
  }

  .upcoming-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.25);
  }

  .upcoming-card__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 0.75rem;
    padding: 0.75rem 1rem;
    color: #ffffff;
    min-width: 70px;
  }

  .date__month {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.05em;
    opacity: 0.95;
  }

  .date__day {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1;
  }

  .upcoming-card__info {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .upcoming-card__info h4 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #1f2937;
  }

  .upcoming-card__name {
    margin: 0;
    font-size: 0.95rem;
    color: rgba(55, 65, 81, 0.75);
  }

  .upcoming-card__time {
    margin: 0;
    font-size: 0.85rem;
    color: #6366f1;
    font-weight: 600;
  }

  .upcoming-card__price {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1f2937;
  }

  .concert-detail__actions-bottom {
    display: flex;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
  }

  .btn {
    flex: 1;
    border: none;
    border-radius: 0.85rem;
    padding: 1rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn--primary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #ffffff;
    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
  }

  .btn--primary:hover,
  .btn--primary:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.4);
    outline: none;
  }

  .btn--secondary {
    background: rgba(255, 255, 255, 0.9);
    color: #4f46e5;
    border: 2px solid #6366f1;
  }

  .btn--secondary:hover,
  .btn--secondary:focus-visible {
    background: rgba(99, 102, 241, 0.1);
    transform: translateY(-2px);
    outline: none;
  }

  .concert-detail--empty {
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;
  }

  .concert-detail--empty p {
    font-size: 1.25rem;
    color: rgba(55, 65, 81, 0.75);
    margin-bottom: 1.5rem;
  }

  @media (max-width: 720px) {
    .concert-detail {
      padding: 1.75rem;
      gap: 1.5rem;
    }

    .concert-detail__hero {
      flex-direction: column;
      text-align: center;
      gap: 1.25rem;
    }

    .hero__title {
      font-size: 1.5rem;
    }

    .hero__artist {
      font-size: 1.1rem;
    }

    .concert-detail__info-grid {
      grid-template-columns: 1fr;
    }

    .upcoming-card {
      grid-template-columns: auto 1fr;
      gap: 1rem;
    }

    .upcoming-card__price {
      grid-column: 1 / -1;
      text-align: right;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(148, 163, 184, 0.15);
    }

    .concert-detail__actions-bottom {
      flex-direction: column;
    }
  }
</style>
