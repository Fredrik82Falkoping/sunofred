# Sun of Red - Music Website med Supabase Authentication

## Översikt
Detta projekt är en musikwebbplats för Sun of Red med Supabase backend för autentisering och filhantering.

## ✅ Funktioner

- **Publik webbplats** - Visa musik och information (index.html)
- **Autentisering** - Inloggning/registrering via Supabase Auth
- **Admin-panel** - Skyddade sidor för att ladda upp låtar
  - **Single Upload** - Ladda upp en låt i taget
  - **Multi Upload** - Ladda upp flera låtar samtidigt med delade inställningar
- **Filuppladdning** - MP3-filer lagras i Supabase Storage
- **Databas** - Spår och kategorier lagras i Supabase

## 🔐 Autentisering

### Inloggning
Gå till `/login.html` för att logga in eller skapa ett nytt konto.

### Skydda sidor
Admin-sidor under `/admin/` är automatiskt skyddade. Användare måste vara inloggade för att komma åt dem.

### Supabase Email-inställningar
I Supabase Dashboard:
1. Gå till **Authentication** > **Email Templates**
2. Du kan anpassa e-postmallar för bekräftelse
3. Under **Authentication** > **Providers** kan du aktivera olika inloggningsmetoder

## 🚀 Deployment på GitHub Pages

### Viktigt: Varför inte Next.js?
GitHub Pages stödjer **endast statiska webbplatser** (HTML, CSS, JavaScript). Next.js kräver en server för SSR (Server Side Rendering) och fungerar därför inte direkt på GitHub Pages.

Detta projekt använder **vanilla JavaScript + Supabase**, vilket är perfekt för GitHub Pages eftersom:
- Allt är statiska filer
- Supabase hanterar backend (auth, databas, storage)
- Ingen server behövs

### Deploysteg för GitHub Pages

1. **Pusha till GitHub:**
   ```bash
   git add .
   git commit -m "Add Supabase authentication"
   git push origin main
   ```

2. **Aktivera GitHub Pages:**
   - Gå till repository settings på GitHub
   - Scrolla ner till "Pages"
   - Välj branch: `main`
   - Välj folder: `/ (root)`
   - Klicka "Save"

3. **Din sida är live på:**
   ```
   https://fredrik82falkoping.github.io/sunofred/
   ```

### Viktiga URL-justeringar för GitHub Pages

När du deployer till GitHub Pages, uppdatera följande URL:er i koden:

**I `assets/js/auth.js`:**
```javascript
// Ändra från:
window.location.href = '/admin/upload.html';
// Till:
window.location.href = '/sunofred/admin/upload.html';

// Ändra från:
window.location.href = '/login.html';
// Till:
window.location.href = '/sunofred/login.html';
```

**I `assets/js/supabase.js`:**
```javascript
// Ändra från:
window.location.href = '/login.html';
// Till:
window.location.href = '/sunofred/login.html';
```

**ELLER** använd relativa URL:er:
```javascript
window.location.href = './admin/upload.html';
window.location.href = './login.html';
```

## 📁 Projektstruktur

```
/
├── index.html              # Publik startsida
├── login.html              # Inloggning/registrering
├── style.css               # Huvudstil för webbplatsen
├── admin/
│   ├── upload.html         # Single track upload (skyddad)
│   └── multi-upload.html   # Multi track upload (skyddad)
├── assets/
│   ├── css/
│   │   ├── auth.css        # Stilar för autentisering
│   │   └── multi-upload.css # Stilar för multi-upload
│   └── js/
│       ├── supabase.js     # Supabase-konfiguration + autentisering
│       ├── auth.js         # Autentiseringslogik
│       └── multi-upload.js # Multi-upload funktionalitet
└── music/                  # Eventuella lokala musikfiler
```

## 🔧 Supabase Setup

### 1. Databas (redan konfigurerad)
Tabeller:
- `tracks` - Musikspår
- `categories` - Kategorier för spår

### 2. Storage
Bucket: `tracks` (för MP3-filer)

### 3. Authentication
Aktivera Email/Password authentication i Supabase Dashboard:
- Gå till **Authentication** > **Providers**
- Aktivera "Email"

### 4. Row Level Security (RLS)
För att skydda data, lägg till RLS-policys i Supabase:

**För `tracks` tabellen:**
```sql
-- Alla kan läsa
CREATE POLICY "Anyone can read tracks"
ON tracks FOR SELECT
TO public
USING (true);

-- Endast autentiserade kan infoga
CREATE POLICY "Authenticated users can insert tracks"
ON tracks FOR INSERT
TO authenticated
WITH CHECK (true);
```

**För `categories` tabellen:**
```sql
-- Alla kan läsa
CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
TO public
USING (true);

-- Endast autentiserade kan infoga
CREATE POLICY "Authenticated users can insert categories"
ON categories FOR INSERT
TO authenticated
WITH CHECK (true);
```

**För Storage bucket `tracks`:**
```sql
-- Alla kan läsa filer
CREATE POLICY "Anyone can read track files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tracks');

-- Endast autentiserade kan ladda upp
CREATE POLICY "Authenticated users can upload tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tracks');
```

## 🎵 Användning

### Single Upload
1. Besök webbplatsen
2. Gå till `/login.html` och skapa ett konto
3. När du är inloggad, gå till `/admin/upload.html`
4. Ladda upp musik med metadata
5. Låtar visas på huvudsidan

### Multi Upload (flera låtar samtidigt)
1. Logga in via `/login.html`
2. Gå till `/admin/multi-upload.html`
3. Välj **språk** och **kategori** som ska gälla för alla låtar
4. Klicka på **"+ Add Track"** för att lägga till fler låtar
5. Fyll i titel, beskrivning, Spotify URL och MP3-fil för varje låt
6. Klicka på **"Upload All Tracks"** för att ladda upp alla på en gång
7. Se progress-bar medan uppladdningen pågår

## 🆚 Alternativ om du vill använda Next.js

Om du absolut vill använda Next.js, har du dessa alternativ:

1. **Vercel** (rekommenderat för Next.js)
   - Gratis hosting för Next.js
   - Automatisk deployment från GitHub
   - Stödjer full Next.js-funktionalitet

2. **Netlify**
   - Gratis tier
   - Stödjer Next.js med Netlify Functions

3. **Static Export (begränsat)**
   - Exportera Next.js till statisk HTML
   - Fungerar på GitHub Pages
   - Men du förlorar SSR, API routes, etc.

## 📝 Licens
© 2026 Sun of Red - Independent artist project
