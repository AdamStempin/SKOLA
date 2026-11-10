# StudyHub

Jednoduchá webová appka na školské veci. Každý sa prihlási a vidí len svoje poznámky, odkazy a úlohy.

- Prihlásenie: e-mail + heslo alebo Google (Firebase Authentication)
- Dáta: Firestore, `users/{uid}` (profil) a `users/{uid}/items/{id}` (položky)
- Funkcie: pridať, otvoriť, upraviť, zmazať, hľadať, filtrovať podľa typu a predmetu, úlohy s termínom a odškrtávaním
- Žiadny vlastný server a žiadny build. Stačia štyri statické súbory.

## Nastavenie (asi 10 minút)

### 1. Firebase projekt
1. Choď na <https://console.firebase.google.com> a vytvor projekt (Google Analytics nepotrebuješ).
2. **Build → Authentication → Get started**. V záložke *Sign-in method* zapni **Email/Password** a **Google**.
3. **Build → Firestore Database → Create database**. Vyber *Production mode* a najbližšiu lokalitu (napr. `eur3`).
4. **Project settings (ozubené koliesko) → Your apps → Web (`</>`)**, zaregistruj appku a skopíruj objekt `firebaseConfig`.

### 2. Konfigurácia
Hodnoty z `firebaseConfig` vlož do `firebase-config.js`. Tieto údaje nie sú tajné, bezpečnosť zabezpečujú pravidlá v ďalšom kroku.

### 3. Pravidlá databázy (dôležité)
V konzole otvor **Firestore Database → Rules**, vlož obsah súboru `firestore.rules` a daj **Publish**. Bez toho nebude appka fungovať (produkčný režim všetko blokuje) a pravidlá zároveň zabezpečia, že nikto nevidí cudzie dáta.

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

**GitHub Pages**: v nastaveniach repozitára zapni Pages a ako zdroj nastav priečinok so súbormi. Potom pridaj výslednú doménu (`meno.github.io`) do *Authorized domains* vo Firebase Authentication.

## Štruktúra

| Súbor | Účel |
|---|---|
| `index.html` | Stránka: prihlásenie, zoznam, dialógy |
| `app.js` | Logika: prihlásenie, profil, práca s Firestore |
| `style.css` | Vzhľad (svetlý aj tmavý režim) |
| `firebase-config.js` | Tvoja konfigurácia Firebase |
| `firestore.rules` | Pravidlá prístupu k databáze |
| `firebase.json` | Konfigurácia nasadenia |

## Nápady na ďalšie kroky

- Zdieľanie položiek so spolužiakmi alebo triedou
- Prílohy (PDF, obrázky) cez Firebase Storage (môže vyžadovať plán Blaze)
- FastAPI backend zo `STUDY HUB SPRINT.md` (štatistiky, študijný plán, export do PDF)
