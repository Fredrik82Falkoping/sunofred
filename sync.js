import fetch from "node-fetch"
import { createClient } from "@supabase/supabase-js"

// ======================
// ENV
// ======================
const {
  LASTFM_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env

if (!LASTFM_API_KEY) {
  console.error('Error: LASTFM_API_KEY must be set in .env')
  console.log('\nGet a free API key at: https://www.last.fm/api/account/create')
  process.exit(1)
}

// Artist is always "Sun of Red"
const ARTIST_NAME = "Sun Of Red"

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

// ======================
// Hämta tracks från Supabase (endast de med Spotify ID)
// ======================
async function getTracksFromDatabase() {
  const { data, error } = await supabase
    .from("tracks")
    .select("id, title, spotify_id")
    .not("spotify_id", "is", null);

  if (error) {
    throw new Error(`Failed to fetch tracks from database: ${error.message}`);
  }

  return data.map(track => ({
    dbId: track.id,
    trackName: track.title,
    artist: ARTIST_NAME
  }));
}

// ======================
// Hämta track info från Last.fm
// ======================
async function getLastFmTrackInfo(artist, track) {
  const params = new URLSearchParams({
    method: 'track.getInfo',
    api_key: LASTFM_API_KEY,
    artist: artist,
    track: track,
    format: 'json'
  });

  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  
  if (!res.ok) {
    console.error(`❌ HTTP Error ${res.status} for ${artist} - ${track}`);
    return null;
  }

  const data = await res.json();
  
  if (data.error) {
    console.error(`❌ Last.fm error for ${artist} - ${track}: ${data.message}`);
    return null;
  }

  if (!data.track) {
    console.log(`ℹ️  Track not found on Last.fm: ${artist} - ${track}`);
    return null;
  }

  const trackData = data.track;
  
  return {
    playcount: parseInt(trackData.playcount) || 0,
    listeners: parseInt(trackData.listeners) || 0
  };
}

// ======================
// Sök efter track på Last.fm (om exakt match inte fungerar)
// ======================
async function searchLastFmTrack(artist, track) {
  const params = new URLSearchParams({
    method: 'track.search',
    api_key: LASTFM_API_KEY,
    artist: artist,
    track: track,
    limit: 1,
    format: 'json'
  });

  const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${params}`);
  
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  
  if (data.results?.trackmatches?.track?.length > 0) {
    const match = data.results.trackmatches.track[0];
    // Try getInfo with the matched artist/track
    return await getLastFmTrackInfo(match.artist, match.name);
  }

  return null;
}

// ======================
// Uppdatera track med Last.fm data
// ======================
async function updateTracksWithLastFm(tracks) {
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const track of tracks) {
    try {
      console.log(`\n🔍 Processing: ${track.trackName}`);
      console.log(`   🎸 Artist: ${track.artist}`);
      
      // Last.fm har inkonsekvent kapitalisering, så vi använder alltid search först
      console.log(`   🔎 Searching Last.fm...`);
      let lastFmData = await searchLastFmTrack(track.artist, track.trackName.trim());
      
      // Om search inte hittar något, försök med exakt match
      if (!lastFmData) {
        console.log(`   🔍 Trying exact match...`);
        lastFmData = await getLastFmTrackInfo(track.artist, track.trackName.trim());
      }
      
      if (lastFmData) {
        const { error } = await supabase
          .from("tracks")
          .update({
            playcount: lastFmData.playcount,
            listeners: lastFmData.listeners,
            lastfm_tags: lastFmData.tags,
            duration_ms: lastFmData.duration,
            album_name: lastFmData.albumName,
            album_cover_url: lastFmData.albumCover,
            updated_at: new Date().toISOString()
          })
          .eq("id", track.dbId);

        if (error) {
          console.error(`   ❌ Database error:`, error.message);
          errors++;
        } else {
          console.log(`   ✅ Playcount: ${lastFmData.playcount.toLocaleString()}, Listeners: ${lastFmData.listeners.toLocaleString()}`);
          if (lastFmData.tags && lastFmData.tags.length > 0) {
            console.log(`   🏷️  Tags: ${lastFmData.tags.join(', ')}`);
          }
          updated++;
        }
      } else {
        console.log(`   ⚠️  Not found on Last.fm`);
        notFound++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errors++;
    }
  }

  return { updated, notFound, errors };
}
async function main() {
  try {
    console.log("🎵 Starting Last.fm sync for Sun of Red...\n")
    console.log("=" .repeat(50))
    
    console.log(`\n🎸 Artist: ${ARTIST_NAME}`)
    console.log("\n1️⃣ Fetching tracks from Supabase...")
    const tracks = await getTracksFromDatabase()
    console.log(`✅ Found ${tracks.length} tracks\n`)

    if (tracks.length === 0) {
      console.log("ℹ️  No tracks to update. Add tracks first.")
      return
    }

    console.log("2️⃣ Fetching data from Last.fm...")
    console.log("   (This may take a while...)\n")
    
    const { updated, notFound, errors } = await updateTracksWithLastFm(tracks)

    console.log("\n" + "=".repeat(50))
    console.log(`\n✅ Sync complete!`)
    console.log(`   ✅ Updated: ${updated}`)
    console.log(`   ⚠️  Not found: ${notFound}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`\n💡 Tip: Tracks with higher playcount/listeners will rank higher!`)
  } catch (err) {
    console.error("\n❌ Sync failed:", err.message)
    if (err.stack) {
      console.error("\nStack trace:", err.stack)
    }
    process.exit(1)
  }
}

main()
