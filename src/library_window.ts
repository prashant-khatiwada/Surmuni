import { emit } from "@tauri-apps/api/event";
import { AudioService } from "./core/audio";
import { TrackMetadata } from "./core/types";

const searchInput = document.getElementById("lib-search") as HTMLInputElement;
const scanBtn = document.getElementById("btn-scan-folder") as HTMLButtonElement;
const tbody = document.getElementById("lib-tbody") as HTMLElement;
const statusText = document.getElementById("lib-status") as HTMLElement;

let allTracks: TrackMetadata[] = [];
let debounceTimer: number | null = null;

function formatDuration(sec: number): string {
  if (!sec || isNaN(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

async function loadTracks() {
  try {
    statusText.innerText = "Querying SQLite database...";
    allTracks = await AudioService.getLibraryTracks();
    renderTracks(allTracks);
  } catch (err) {
    statusText.innerText = `Error loading tracks: ${err}`;
  }
}

function renderTracks(tracks: TrackMetadata[]) {
  tbody.innerHTML = "";
  if (tracks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">No tracks found. Click "+ SCAN FOLDER" to catalog your music directory.</td></tr>`;
    statusText.innerText = "0 tracks";
    return;
  }

  statusText.innerText = `${tracks.length} tracks cataloged in SQLite database`;

  tracks.forEach((track, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="color: #64748b;">${i + 1}</td>
      <td style="font-weight: 600; color: #fff;">${track.title || "Unknown"}</td>
      <td style="color: #94a3b8;">${track.artist || "Unknown Artist"}</td>
      <td style="color: #64748b;">${track.album || ""}</td>
      <td style="color: #00e5ff; font-family: monospace;">${formatDuration(track.duration_secs)}</td>
    `;

    tr.addEventListener("dblclick", () => {
      // Emit IPC event to main player to add and play this track
      emit("library-play-track", track);
    });

    tbody.appendChild(tr);
  });
}

scanBtn?.addEventListener("click", async () => {
  try {
    const folder = await AudioService.pickFolder();
    if (!folder) return;
    statusText.innerText = `Scanning directory: ${folder}...`;
    const count = await AudioService.scanLibraryFolder(folder);
    statusText.innerText = `Scan complete. Indexed ${count} tracks.`;
    await loadTracks();
  } catch (e) {
    statusText.innerText = `Scan error: ${e}`;
  }
});

searchInput?.addEventListener("input", () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(async () => {
    const q = searchInput.value.trim();
    if (!q) {
      renderTracks(allTracks);
      return;
    }
    try {
      const results = await AudioService.searchLibrary(q);
      renderTracks(results);
    } catch (e) {
      statusText.innerText = `Search error: ${e}`;
    }
  }, 120);
});

loadTracks();
