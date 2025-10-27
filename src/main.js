import App from "./App.svelte";
import { initRouter } from "./router";

// Initialize the app
const app = new App({
  target: document.getElementById("app"),
});

// Initialize router after app is mounted
initRouter();

export default app;
