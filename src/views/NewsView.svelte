<script>
  import { content, favoriteAlbums, ratedAlbums, loading, token } from "../stores";
  import NewsFeed from "../components/NewsFeed.svelte";
</script>

<NewsFeed
  content={$content}
  favoriteAlbums={$favoriteAlbums}
  ratedAlbums={$ratedAlbums}
  loading={$loading}
  token={$token}
/>
