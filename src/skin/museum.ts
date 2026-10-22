// Winamp Skin Museum Client (skins.webamp.org)
// Queries the public Skin Museum API for instant skin discovery and preview

export interface MuseumSkin {
  md5: string;
  name: string;
  download_url: string;
  screenshot_url: string;
}

export class SkinMuseumClient {
  private static readonly GRAPHQL_ENDPOINT = "https://api.webamp.org/graphql";

  static async searchSkins(query: string = "classic"): Promise<MuseumSkin[]> {
    const q = (query || "classic").trim();
    try {
      const gqlQuery = {
        query: `query SearchSkins($query: String!) {
          search_skins(query: $query, first: 30) {
            md5
            filename
            screenshot_url
            download_url
          }
        }`,
        variables: { query: q || "classic" },
      };

      const res = await fetch(this.GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gqlQuery),
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const payload = await res.json();
      const rawSkins = payload?.data?.search_skins || [];

      const results: MuseumSkin[] = rawSkins
        .filter((item: any) => item && (item.download_url || item.md5))
        .map((item: any) => {
          const md5 = item.md5 || "";
          const filename = item.filename || "Retro Skin";
          const cleanName = filename.replace(/\.(wsz|wal|zip)$/i, "");
          const downloadUrl = item.download_url || (md5 ? `https://r2.webampskins.org/skins/${md5}.wsz` : "");
          const screenshotUrl = item.screenshot_url || (md5 ? `https://r2.webampskins.org/screenshots/${md5}.png` : "");

          return {
            md5,
            name: cleanName,
            download_url: downloadUrl,
            screenshot_url: screenshotUrl,
          };
        });

      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.warn("Could not query Webamp GraphQL API, falling back to curated skins:", e);
    }

    // High quality curated classic skins with direct working download URLs
    return [
      {
        md5: "dca779215a8699cab78c5dcae9c38cf0",
        name: "Winamp Classic Original",
        download_url: "https://r2.webampskins.org/skins/dca779215a8699cab78c5dcae9c38cf0.wsz",
        screenshot_url: "https://r2.webampskins.org/screenshots/dca779215a8699cab78c5dcae9c38cf0.png",
      },
      {
        md5: "3be1e29879fb3c17bc0e38cbacae815f",
        name: "Blueslaad Wobachi Retro",
        download_url: "https://r2.webampskins.org/skins/3be1e29879fb3c17bc0e38cbacae815f.wsz",
        screenshot_url: "https://r2.webampskins.org/screenshots/3be1e29879fb3c17bc0e38cbacae815f.png",
      },
      {
        md5: "c5f8bc8782a03328ebbc19ad0ca934f2",
        name: "Cyberpunk Neon 2000",
        download_url: "https://r2.webampskins.org/skins/c5f8bc8782a03328ebbc19ad0ca934f2.wsz",
        screenshot_url: "https://r2.webampskins.org/screenshots/c5f8bc8782a03328ebbc19ad0ca934f2.png",
      },
      {
        md5: "winampskin_Windows_Classic",
        name: "Windows Classic 95/98",
        download_url: "https://archive.org/download/winampskin_Windows_Classic/Windows_Classic.wsz",
        screenshot_url: "https://archive.org/services/img/winampskin_Windows_Classic",
      },
      {
        md5: "winampskin_classic_mario",
        name: "Super Mario Retro",
        download_url: "https://archive.org/download/winampskin_classic_mario/classic_mario.wsz",
        screenshot_url: "https://archive.org/services/img/winampskin_classic_mario",
      },
    ];
  }
}
