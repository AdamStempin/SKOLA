# StudyHub

Osobné úložisko na školské veci. Každý sa prihlási a vidí len svoje súbory, poznámky a odkazy, zoradené podľa predmetu.

- Prihlásenie: e-mail + heslo alebo Google (Firebase Authentication)
- Dáta: Firestore, `users/{uid}` (profil) a `users/{uid}/items/{id}` (položky)
- Súbory: Firebase Storage, `users/{uid}/files/...` (max. 25 MB na súbor)
- Funkcie: pridať, otvoriť/stiahnuť, upraviť, zmazať, hľadať, filtrovať podľa typu a predmetu
- Žiadny vlastný server a žiadny build. Stačí pár statických súborov.

## Nastavenie (asi 10 minút)

### 1. Firebase projekt
1. Choď na <https://console.firebase.google.com> a vytvor projekt (Google Analytics nepotrebuješ).
2. **Build → Authentication → Get started**. V záložke *Sign-in method* zapni **Email/Password** a **Google**.
3. **Build → Firestore Database → Create database**. Vyber *Production mode* a najbližšiu lokalitu (napr. `eur3`).
4. **Build → Storage → Get started**. Pozor: nové projekty vyžadujú na Storage plán **Blaze** (platba podľa spotreby, treba pripojiť kartu). Malé použitie sa zmestí do bezplatnej kvóty, v konzole si môžeš nastaviť upozornenie na rozpočet. Bez Storage fungujú poznámky a odkazy, nahrávanie súborov nie.
5. **Project settings (ozubené koliesko) → Your apps → Web (`</>`)**, zaregistruj appku a skopíruj objekt `firebaseConfig`.

### 2. Konfigurácia
Hodnoty z `firebaseConfig` vlož do `firebase-config.js`. Tieto údaje nie sú tajné, bezpečnosť zabezpečujú pravidlá v ďalšom kroku.

### 3. Pravidlá (dôležité)
- **Firestore Database → Rules**: vlož obsah `firestore.rules` a daj **Publish**.
- **Storage → Rules**: vlož obsah `storage.rules` a daj **Publish**.

Bez pravidiel appka nefunguje (produkčný režim všetko blokuje) a pravidlá zároveň zabezpečia, že nikto nevidí cudzie dáta.

### 4. Povolené domény
V **Authentication → Settings → Authorized domains** musí byť doména, na ktorej appku spustíš (`localhost` tam je predvolene).

## Spustenie lokálne

Appka používa ES moduly, preto sa nedá otvoriť dvojklikom na `index.html`. Spusti v priečinku `studyhub/`:

```
python3 -m http.server 8000
```

a otvor <http://localhost:8000>.

## Nasadenie

**Firebase Hosting** (odporúčam, je v rovnakom projekte):
```
npm install -g firebase-tools
firebase login
firebase init      # vyber existujúci projekt, súbor firebase.json už je pripravený
firebase deploy
```
Alebo len pravidlá: `firebase deploy --only firestore:rules,storage`.

**GitHub Pages**: v nastaveniach repozitára zapni Pages a ako zdroj nastav priečinok so súbormi. Potom pridaj výslednú doménu (`meno.github.io`) do *Authorized domains* vo Firebase Authentication.

## Štruktúra

| Súbor | Účel |
|---|---|
| `index.html` | Stránka: prihlásenie, zoznam, dialógy |
| `app.js` | Logika: prihlásenie, profil, Firestore, nahrávanie súborov |
| `style.css` | Vzhľad (svetlý aj tmavý režim) |
| `firebase-config.js` | Tvoja konfigurácia Firebase |
| `firestore.rules` | Pravidlá prístupu k databáze |
| `storage.rules` | Pravidlá prístupu k súborom |
| `firebase.json` | Konfigurácia nasadenia |

## Nápady na ďalšie kroky

- Zdieľanie položiek so spolužiakmi alebo triedou
- Priečinky a štítky
- FastAPI backend zo `STUDY HUB SPRINT.md`
