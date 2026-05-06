import fetch from "node-fetch"
import { createClient } from "@supabase/supabase-js"

// ======================
// ENV
// ======================
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ======================
// Spotify auth (refresh token flow)
// ======================
async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization":
        "Basic " +
        Buffer.from(
          `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  })

  const data = await res.json()

  if (!data.access_token) {
    console.error("Spotify API response:", data)
    throw new Error(`Failed to get Spotify access token: ${data.error || data.error_description || 'Unknown error'}`)
  }

  return data.access_token
}

// ======================
// Hämta tracks från Supabase
// ======================
async function getTracksFromDatabase() {
  const { data, error } = await supabase
    .from("tracks")
    .select("id, spotify_id")
    .not("spotify_id", "is", null);

  if (error) {
    throw new Error(`Failed to fetch tracks from database: ${error.message}`);
  }

  // Extract Spotify IDs from URLs
  const tracks = data.map(track => {
    // Extract ID from URL like: https://open.spotify.com/track/ID
    return {
      dbId: track.id,
      spotifyId: track.spotify_id,
      spotifyUrl: `https://open.spotify.com/track/${track.spotify_id}` 
    };
  }).filter(t => t.spotifyId !== null);

  return tracks;
}

// ======================
// Hämta popularity från Spotify (fungerar utan Premium!)
// ======================
async function getTrackPopularity(accessToken, spotifyId) {
  const res = await fetch(
    `https://api.spotify.com/v1/tracks/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error fetching track ${spotifyId}:`, text);
    return null;
  }

  const data = await res.json();
  return data.popularity;
}

// ======================
// Uppdatera popularity för alla tracks
// ======================
async function updateTrackPopularities(accessToken, tracks) {
  let updated = 0;
  let failed = 0;

  for (const track of tracks) {
    try {
      const popularity = await getTrackPopularity(accessToken, track.spotifyId);
      
      if (popularity !== null) {
        const { error } = await supabase
          .from("tracks")
          .update({ 
            popularity: popularity,
            updated_at: new Date().toISOString()
          })
          .eq("id", track.dbId);

        if (error) {
          console.error(`❌ Failed to update track ${track.dbId}:`, error.message);
          failed++;
        } else {
          console.log(`✅ Updated track ${track.dbId}: popularity = ${popularity}`);
          updated++;
        }
      } else {
        failed++;
      }

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`❌ Error processing track ${track.dbId}:`, err.message);
      failed++;
    }
  }

  return { updated, failed };
}

// ======================
// MAIN
// ======================
async function main() {
  try {
    console.log("🎵 Starting Spotify popularity sync...\n")
    
    console.log("1️⃣ Getting Spotify access token...")
    const token = await getAccessToken()
    console.log("✅ Access token received\n")
    
    console.log("2️⃣ Fetching tracks from Supabase...")
    const tracks = await getTracksFromDatabase()
    console.log(`✅ Found ${tracks.length} tracks with Spotify IDs\n`)

    if (tracks.length === 0) {
      console.log("ℹ️  No tracks to update. Add tracks with Spotify IDs first.")
      return
    }

    console.log("3️⃣ Updating popularity from Spotify...")
    const { updated, failed } = await updateTrackPopularities(token, tracks)

    console.log(`\n✅ Sync complete!`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Failed: ${failed}`)
  } catch (err) {
    console.error("\n❌ Sync failed:", err.message)
    if (err.stack) {
      console.error("\nStack trace:", err.stack)
    }
    process.exit(1)
  }
}

main()
