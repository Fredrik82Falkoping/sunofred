# Sun of Red - Music Artist Website

En webbplats för musikartisten Sun of Red med Spotify-integration och innehållshantering via Supabase.

## 📋 Översikt

Detta projekt är en frontend-applikation för musikartisten Sun of Red som inkluderar:

- **Publik webbplats** - Visa låtar, album och artistinformation
- **Admin-gränssnitt** - Hantera låtar, kategorier och taggar
- **Spotify-integration** - Automatisk synkronisering av låtar från Spotify
- **Multi-upload** - Ladda upp flera ljudfiler samtidigt till Supabase Storage
- **Kategorisystem** - Organisera musik efter kategorier och taggar
- **Flerspråksstöd** - Hantera översättningar för kategorier

## 🏗️ Teknisk Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **API-integration**: LastFM Web API
- **Deployment**: Statiska filer (kan hostas på vilken statisk hosting som helst)

## 📁 Projektstruktur

```
sunofred/
├── index.html              # Startsida
├── browse.html             # Bläddra bland låtar
├── category.html           # Kategorivy
├── tag.html               # Taggvy
├── login.html             # Admin-inloggning
├── sync.js                # Spotify-synkroniseringsskript
├── package.json           # Node.js dependencies
├── admin/
│   ├── edit.html          # Redigera enskild låt
│   ├── edit-categories.html  # Hantera kategorier
│   └── multi-upload.html  # Multi-upload interface
├── assets/
│   ├── css/              # Stilmallar
│   └── js/               # JavaScript-moduler
│       ├── models/       # MVC-modeller (Category, Tag, Track)
│       ├── auth.js       # Autentisering
│       ├── browse.js     # Bläddringsfunktionalitet
│       ├── category.js   # Kategorivisning
│       ├── config.js     # Supabase-konfiguration
│       └── ...
└── sql/                  # Databas-skript och policies
```

## 🚀 Kom Igång

### Förutsättningar

- Node.js (version 18+)
- Ett Supabase-konto
- Ett Spotify Developer-konto (för synkronisering)

### Installation

1. **Klona projektet**
   ```bash
   git clone <repository-url>
   cd sunofred
   ```

2. **Installera dependencies**
   ```bash
   npm install
   ```

3. **Konfigurera Supabase**
   
   Kopiera `assets/js/config.example.js` till `assets/js/config.js`:
   ```bash
   cp assets/js/config.example.js assets/js/config.js
   ```
   
   Uppdatera med dina Supabase-uppgifter:
   ```javascript
   export const SUPABASE_URL = 'your-project-url'
   export const SUPABASE_ANON_KEY = 'your-anon-key'
   ```

4. **Sätt upp databasen**
   
   Kör SQL-skripten i `sql/`-mappen i din Supabase SQL-editor:
   - `create_tag_tables.sql` - Skapa tabeller
   - `storage_policies.sql` - Storage-policies
   - `dev_mode_policies.sql` - Development policies
   - `make_bucket_public.sql` - Gör bucket publikt tillgänglig

5. **Konfigurera Spotify (valfritt)**
   
   För att använda Spotify-synkronisering, skapa en `.env`-fil:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
   SPOTIFY_ARTIST_ID=your_artist_id
   ```

### Användning

**Starta utvecklingsserver:**
```bash
# Använd en lokal server, t.ex.:
python -m http.server 8000
# eller
npx serve
```

**Synkronisera från Spotify:**
```bash
npm run sync
```

**Hämta Spotify-token:**
```bash
npm run get-token
```

## 🔐 Säkerhet och Autentisering

- Admin-sidor skyddas med Supabase Auth
- Row Level Security (RLS) policies på alla tabeller
- Separata permissions för läsning och skrivning
- Storage-policies för filuppladdning

## 📊 Databas Schema

### Huvudtabeller

- **`tracks`** - Låtar med metadata
- **`categories`** - Musikkategorier
- **`tags`** - Taggar för låtar
- **`track_tags`** - Many-to-many relation mellan tracks och tags
- **`category_translations`** - Översättningar för kategorier

### Storage Buckets

- **`music`** - Ljudfiler (MP3, FLAC) och albumomslag lagras i Supabase Storage
  - Filer laddas upp via multi-upload-gränssnittet eller edit-funktionen
  - Publikt tillgängliga via Supabase Storage URLs
  - Kan även lagras lokalt under utveckling (valfritt)

## 🎨 MVC-Arkitektur

Projektet använder en MVC-inspirerad struktur:

- **Models** (`assets/js/models/`) - Datahantering och business logic
  - `Track.js` - Låthantering
  - `Category.js` - Kategorihantering  
  - `Tag.js` - Tagghantering

- **Views** - HTML-filer med inline templates

- **Controllers** - JavaScript-filer som hanterar användarinteraktion
  - `browse.js`, `category.js`, `edit-track.js`, etc.

## 🔄 GitHub Actions

Projektet har automatiserad deployment via GitHub Actions (se `.github/workflows/`).

Secrets som behövs i GitHub:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 📝 Vanliga Uppgifter

### Lägga till en ny låt manuellt
1. Logga in på admin-sidan
2. Gå till Browse-sidan
3. Klicka på "Edit" för att lägga till ny låt

### Ladda upp flera filer samtidigt
1. Gå till `/admin/multi-upload.html`
2. Dra och släpp filer eller välj från filväljaren
3. Filer laddas upp till Supabase Storage

### Hantera kategorier
1. Gå till `/admin/edit-categories.html`
2. Lägg till, redigera eller ta bort kategorier
3. Hantera översättningar för varje kategori

## 🐛 Felsökning

**Problem med att ladda upp filer:**
- Kontrollera att storage bucket är korrekt konfigurerad
- Verifiera storage policies i Supabase

**Autentiseringsproblem:**
- Kontrollera att `config.js` har rätt Supabase-uppgifter
- Verifiera att användaren har rätt behörigheter

**Spotify-synkronisering fungerar inte:**
- Kontrollera att `.env`-filen har rätt credentials
- Verifiera att Spotify-appen är korrekt konfigurerad

## 📄 Licens

© 2026 Sun of Red. All rights reserved.

## 🤝 Kontakt

För frågor eller support, kontakta projektägaren.
