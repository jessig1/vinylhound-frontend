<script>
  import { createEventDispatcher } from "svelte";

  export let artistName = "";
  export let limit = 5;

  const dispatch = createEventDispatcher();

  let showPastConcerts = false;

  // Placeholder concert data - mix of future and past concerts
  const today = new Date();
  const allConcerts = [
    // Future concerts
    {
      id: 1,
      name: "Summer Tour 2026",
      date: new Date(today.getFullYear(), today.getMonth() + 1, 15, 19, 0),
      venue: {
        name: "Red Rocks Amphitheatre",
        city: "Morrison",
        state: "CO",
      },
      ticketPrice: 150.0,
    },
    {
      id: 2,
      name: "Fall Festival Performance",
      date: new Date(today.getFullYear(), today.getMonth() + 2, 22, 20, 0),
      venue: {
        name: "Madison Square Garden",
        city: "New York",
        state: "NY",
      },
      ticketPrice: 180.0,
    },
    {
      id: 3,
      name: "World Tour - LA Stop",
      date: new Date(today.getFullYear(), today.getMonth() + 3, 5, 19, 30),
      venue: {
        name: "Hollywood Bowl",
        city: "Los Angeles",
        state: "CA",
      },
      ticketPrice: 165.0,
    },
    {
      id: 4,
      name: "Acoustic Sessions",
      date: new Date(today.getFullYear(), today.getMonth() + 4, 12, 18, 0),
      venue: {
        name: "The Fillmore",
        city: "San Francisco",
        state: "CA",
      },
      ticketPrice: 95.0,
    },
    {
      id: 5,
      name: "New Year's Eve Spectacular",
      date: new Date(today.getFullYear(), 11, 31, 21, 0),
      venue: {
        name: "Crypto.com Arena",
        city: "Los Angeles",
        state: "CA",
      },
      ticketPrice: 250.0,
    },
    // Past concerts
    {
      id: 6,
      name: "Spring Arena Tour",
      date: new Date(today.getFullYear(), today.getMonth() - 1, 10, 20, 0),
      venue: {
        name: "The Forum",
        city: "Inglewood",
        state: "CA",
      },
      ticketPrice: 140.0,
    },
    {
      id: 7,
      name: "Winter Festival Headliner",
      date: new Date(today.getFullYear(), today.getMonth() - 2, 18, 19, 30),
      venue: {
        name: "Barclays Center",
        city: "Brooklyn",
        state: "NY",
      },
      ticketPrice: 160.0,
    },
    {
      id: 8,
      name: "Acoustic Sessions Tour",
      date: new Date(today.getFullYear(), today.getMonth() - 3, 5, 18, 0),
      venue: {
        name: "The Ryman Auditorium",
        city: "Nashville",
        state: "TN",
      },
      ticketPrice: 85.0,
    },
    {
      id: 9,
      name: "New Year's Eve 2024",
      date: new Date(today.getFullYear() - 1, 11, 31, 22, 0),
      venue: {
        name: "Times Square",
        city: "New York",
        state: "NY",
      },
      ticketPrice: 300.0,
    },
  ];

  function isPastConcert(concert) {
    return concert.date < today;
  }

  $: futureConcerts = allConcerts.filter(c => !isPastConcert(c)).slice(0, limit);
  $: pastConcerts = allConcerts.filter(c => isPastConcert(c)).sort((a, b) => b.date - a.date).slice(0, limit);
  $: concerts = showPastConcerts ? pastConcerts : futureConcerts;
  $: hasPastConcerts = allConcerts.some(c => isPastConcert(c));
  $: hasFutureConcerts = allConcerts.some(c => !isPastConcert(c));

  function formatDate(date) {
    if (!date) return "Date TBA";
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
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

  function getRelativeTime(date) {
    if (!date) return "";
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return "Past";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `In ${days} days`;
    if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
    if (days < 365) return `In ${Math.floor(days / 30)} months`;
    return `In ${Math.floor(days / 365)} years`;
  }

  function handleConcertClick(concert) {
    dispatch("selectconcert", { concert });
  }
</script>

<section class="upcoming-concerts">
  <header>
    <div class="header-content">
      <div>
        <h3>{showPastConcerts ? "Past Concerts" : "Upcoming Concerts"}</h3>
        <p>
          {#if showPastConcerts}
            Previous performances by {artistName || "this artist"}
          {:else}
            Catch {artistName || "this artist"} live at these venues
          {/if}
        </p>
      </div>
      {#if showPastConcerts && hasFutureConcerts}
        <button
          type="button"
          class="toggle-concerts-btn"
          on:click={() => (showPastConcerts = false)}
        >
          Show Upcoming
        </button>
      {:else if !showPastConcerts && hasPastConcerts}
        <button
          type="button"
          class="toggle-concerts-btn toggle-concerts-btn--secondary"
          on:click={() => (showPastConcerts = true)}
        >
          Show Past Concerts
        </button>
      {/if}
    </div>
  </header>
  {#if concerts.length > 0}
    <ul class="concerts-list">
      {#each concerts as concert (concert.id)}
        <li>
          <button
            type="button"
            class="concert-card"
            on:click={() => handleConcertClick(concert)}
          >
          <div class="concert-card__date">
            <div class="concert-card__date-badge">
              <span class="date-badge__month"
                >{concert.date.toLocaleDateString("en-US", {
                  month: "short",
                })}</span
              >
              <span class="date-badge__day"
                >{concert.date.toLocaleDateString("en-US", { day: "numeric" })}</span
              >
            </div>
            <span class="concert-card__time">{formatTime(concert.date)}</span>
          </div>
          <div class="concert-card__details">
            <h4 class="concert-card__title">{concert.name}</h4>
            <div class="concert-card__venue">
              <svg
                class="venue-icon"
                width="16"
                height="16"
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
              <span class="venue-name">{concert.venue.name}</span>
            </div>
            <div class="concert-card__location">
              {concert.venue.city}, {concert.venue.state}
            </div>
          </div>
          <div class="concert-card__meta">
            <span class="concert-card__relative-time"
              >{getRelativeTime(concert.date)}</span
            >
            {#if concert.ticketPrice}
              <span class="concert-card__price"
                >{formatPrice(concert.ticketPrice)}</span
              >
            {/if}
          </div>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="concerts-list--empty">
      {#if showPastConcerts}
        No past concert records available.
      {:else}
        No upcoming concerts scheduled at this time.
      {/if}
    </p>
  {/if}
</section>

<style>
  .upcoming-concerts {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
    border-radius: 1rem;
    padding: 1.5rem 1.75rem;
    box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.15);
  }

  .upcoming-concerts header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-content > div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .upcoming-concerts header h3 {
    margin: 0;
    font-size: 1.35rem;
    color: #312e81;
    font-weight: 700;
  }

  .upcoming-concerts header p {
    margin: 0;
    color: rgba(55, 65, 81, 0.82);
    font-size: 0.95rem;
  }

  .toggle-concerts-btn {
    border: none;
    border-radius: 0.75rem;
    padding: 0.55rem 1.15rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
    background: #4f46e5;
    color: #ffffff;
    white-space: nowrap;
    font-size: 0.9rem;
  }

  .toggle-concerts-btn:hover,
  .toggle-concerts-btn:focus-visible {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.35);
    outline: none;
  }

  .toggle-concerts-btn--secondary {
    background: rgba(79, 70, 229, 0.15);
    color: #312e81;
  }

  .toggle-concerts-btn--secondary:hover,
  .toggle-concerts-btn--secondary:focus-visible {
    background: rgba(79, 70, 229, 0.25);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
  }

  .concerts-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .concert-card {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1.25rem;
    align-items: center;
    background: #ffffff;
    border-radius: 1rem;
    padding: 1.25rem;
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: 1px solid rgba(148, 163, 184, 0.12);
    cursor: pointer;
    text-align: left;
    font: inherit;
  }

  .concert-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.25);
  }

  .concert-card:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  .concert-card__date {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .concert-card__date-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 0.85rem;
    padding: 0.75rem 1rem;
    color: #ffffff;
    min-width: 70px;
    box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
  }

  .date-badge__month {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.08em;
    opacity: 0.95;
  }

  .date-badge__day {
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
  }

  .concert-card__time {
    font-size: 0.8rem;
    color: rgba(55, 65, 81, 0.75);
    font-weight: 600;
  }

  .concert-card__details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .concert-card__title {
    margin: 0;
    font-size: 1.1rem;
    color: #111827;
    font-weight: 700;
  }

  .concert-card__venue {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #4f46e5;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .venue-icon {
    flex-shrink: 0;
    color: #6366f1;
  }

  .venue-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .concert-card__location {
    font-size: 0.85rem;
    color: rgba(55, 65, 81, 0.75);
  }

  .concert-card__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    text-align: right;
  }

  .concert-card__relative-time {
    font-size: 0.8rem;
    color: rgba(79, 70, 229, 0.85);
    font-weight: 600;
    background: rgba(99, 102, 241, 0.12);
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
  }

  .concert-card__price {
    font-size: 1rem;
    font-weight: 700;
    color: #1f2937;
  }

  .concerts-list--empty {
    margin: 0;
    padding: 1rem;
    color: rgba(55, 65, 81, 0.75);
    text-align: center;
    background: rgba(148, 163, 184, 0.08);
    border-radius: 0.75rem;
  }

  @media (max-width: 720px) {
    .concert-card {
      grid-template-columns: auto 1fr;
      gap: 1rem;
    }

    .concert-card__meta {
      grid-column: 1 / -1;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(148, 163, 184, 0.15);
    }

    .upcoming-concerts {
      padding: 1.25rem;
    }

    .header-content {
      flex-direction: column;
      align-items: stretch;
    }

    .toggle-concerts-btn {
      align-self: flex-start;
    }
  }

  @media (max-width: 480px) {
    .concert-card__date-badge {
      min-width: 60px;
      padding: 0.5rem 0.75rem;
    }

    .date-badge__day {
      font-size: 1.5rem;
    }

    .concert-card__title {
      font-size: 1rem;
    }

    .venue-name {
      font-size: 0.9rem;
    }
  }
</style>
