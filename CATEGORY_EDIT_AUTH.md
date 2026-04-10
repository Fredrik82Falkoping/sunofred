# Hur man redigerar kategorier - Två alternativ

## ✅ Alternativ 1: Logga in (Rekommenderat)

1. Gå till **`/login.html`** i din webbläsare
2. Logga in med dina Supabase-credentials (email/password)
3. När du är inloggad, gå till **`/admin/edit-categories.html`**
4. Nu kan du redigera kategorier! 🎉

### Skapa ett konto om du inte har ett:
```bash
# I Supabase Dashboard:
1. Gå till Authentication → Users
2. Klicka "Add user" → "Create new user"
3. Ange email och password
4. Använd dessa credentials i /login.html
```

---

## 🔓 Alternativ 2: Stäng av säkerhet (Endast utveckling!)

**⚠️ VARNING:** Detta tar bort all säkerhet. Använd bara för lokal utveckling!

### Steg 1: Öppna Supabase SQL Editor
1. Gå till din Supabase-dashboard
2. Klicka på **SQL Editor** i sidomenyn
3. Klicka **New query**

### Steg 2: Kör SQL
Kopiera och klistra in detta:

```sql
-- Drop existing restrictive policies on categories table
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON categories;

-- Create permissive policies for development
CREATE POLICY "Anyone can insert categories (DEV)"
ON categories FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update categories (DEV)"
ON categories FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete categories (DEV)"
ON categories FOR DELETE
TO public
USING (true);

-- Drop existing restrictive policies on storage.objects for category-images
DROP POLICY IF EXISTS "Authenticated users can upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update category images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete category images" ON storage.objects;

-- Create permissive policies for storage
CREATE POLICY "Anyone can upload category images (DEV)"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Anyone can update category images (DEV)"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'category-images');

CREATE POLICY "Anyone can delete category images (DEV)"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'category-images');
```

### Steg 3: Klicka "Run" (eller CMD+Enter / CTRL+Enter)

### Steg 4: Gå till `/admin/edit-categories.html`
Nu kan du redigera utan att logga in!

---

## 🔍 Felsökning

### Hur vet jag om jag är inloggad?
1. Öppna **Developer Console** (F12)
2. Gå till `/admin/edit-categories.html`
3. I Console ser du antingen:
   - ✅ `Auth status: Logged in as din@email.com`
   - ❌ `Auth status: Not logged in`

### Kontrollera vilka policies som är aktiva
Kör detta i Supabase SQL Editor:

```sql
-- Se policies på categories-tabellen
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'categories';

-- Se policies på storage
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'objects'
AND policyname LIKE '%category%';
```

### Återställ säkerhet efter testning
Om du använde Alternativ 2, återställ säkerheten innan produktion:

```sql
-- Ta bort dev-policies
DROP POLICY IF EXISTS "Anyone can insert categories (DEV)" ON categories;
DROP POLICY IF EXISTS "Anyone can update categories (DEV)" ON categories;
DROP POLICY IF EXISTS "Anyone can delete categories (DEV)" ON categories;
DROP POLICY IF EXISTS "Anyone can upload category images (DEV)" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update category images (DEV)" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete category images (DEV)" ON storage.objects;

-- Återskapa säkra policies
CREATE POLICY "Authenticated users can update categories"
ON categories FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Authenticated users can update category images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images');
```

---

## 📝 Sammanfattning

- **För produktion**: Använd alltid Alternativ 1 (logga in)
- **För snabb testning**: Alternativ 2 är OK, men glöm inte återställa!
- Sidan visar nu ett vänligt meddelande istället för att bara redirecta
- Console loggar visar om du är inloggad eller inte
