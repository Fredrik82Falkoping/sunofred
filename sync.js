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
// Hämta dina tracks från Spotify
// ======================
async function getTracks(accessToken) {
  // TODO: Ersätt med ditt riktiga Spotify Artist ID
  // Hitta det på: https://open.spotify.com/artist/YOUR_ID
  const artistId = process.env.SPOTIFY_ARTIST_ID || "YOUR_ARTIST_ID"
  
  if (artistId === "YOUR_ARTIST_ID") {
    throw new Error("Please set SPOTIFY_ARTIST_ID in .env file")
  }

  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=SE`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  )

  const data = await res.json()
  
  if (data.error) {
    throw new Error(`Spotify API error: ${data.error.message}`)
  }
  
  return data.tracks || []
}

// ======================
// Sync till Supabase
// ======================
async function syncTracks(tracks) {
  for (const track of tracks) {
    const { error } = await supabase
      .from("tracks")
      .upsert({
        spotify_id: track.id,
        name: track.name,
        popularity: track.popularity,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "spotify_id"
      })

    if (error) {
      console.error("Supabase error:", error)
    } else {
      console.log(`Updated: ${track.name} (${track.popularity})`)
    }
  }
}

// ======================
// MAIN
// ======================
async function main() {
  try {
    const token = await getAccessToken()
    const tracks = await getTracks(token)

    console.log(`Fetched ${tracks.length} tracks`)

    await syncTracks(tracks)

    console.log("Sync complete")
  } catch (err) {
    console.error("Sync failed:", err)
    process.exit(1)
  }
}

main()
