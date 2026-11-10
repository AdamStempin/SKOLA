# SKOLA

Školské projekty a dokumenty. Hlavná časť repozitára je **StudyHub**, osobné úložisko na školské veci.

## O projekte

StudyHub je jednoduchá webová appka, kam si môžeš ukladať všetko, čo potrebuješ do školy, na jedno miesto a mať to dostupné z akéhokoľvek zariadenia.

**Čo vie:**
- Prihlásenie cez e-mail a heslo alebo cez Google, každý používateľ má vlastný profil
- Každý vidí len svoje veci, cudzie dáta sa nedajú zobraziť
- Ukladanie troch typov položiek: **poznámky**, **odkazy** a **súbory**
- Triedenie podľa **predmetu**, filtrovanie podľa typu a vyhľadávanie
- Otvorenie, úprava a mazanie položiek
- Svetlý a tmavý vzhľad podľa nastavenia zariadenia

**Ako je postavená:**

| Časť | Technológia |
|---|---|
| Stránka | HTML, CSS a JavaScript, bez frameworku a bez build kroku |
| Prihlásenie | Firebase Authentication |
| Databáza | Cloud Firestore (`users/{uid}` a `users/{uid}/items/{id}`) |
| Súbory | Firebase Storage (max. 25 MB na súbor) |
| Zabezpečenie | Firestore a Storage pravidlá, každý má prístup len k svojmu |

Žiadny vlastný server nie je potrebný. Stránka je statická a s Firebase komunikuje priamo z prehliadača.

## Štruktúra repozitára

```
SKOLA/
├── README.md              tento súbor
├── STUDY HUB SPRINT.md    nápady na rozšírenie (FastAPI backend)
└── studyhub/
    ├── index.html         stránka
    ├── app.js             logika appky
    ├── style.css          vzhľad
    ├── firebase-config.js konfigurácia Firebase projektu
    ├── firestore.rules    pravidlá databázy
    ├── storage.rules      pravidlá úložiska súborov
    ├── firebase.json      konfigurácia nasadenia
    └── README.md          podrobnejšia dokumentácia appky
```

## Stiahnutie a spustenie

### Čo potrebuješ
- **Git** (<https://git-scm.com>)
- **Python 3** na spustenie lokálneho servera (<https://www.python.org>), alebo akýkoľvek iný statický server
- Prehliadač (Chrome, Firefox, Edge, Safari)
- Účet Google na prácu s Firebase

### 1. Stiahni repozitár
```
git clone https://github.com/AdamStempin/SKOLA.git
cd SKOLA/studyhub
```
Ak už repozitár máš, aktualizuj ho príkazom `git pull`.

### 2. Nastav Firebase
Súbor `studyhub/firebase-config.js` už obsahuje údaje projektu `school-database-2026`. Ak appku spúšťaš s týmto projektom, preskoč na bod **b**. Ak ju chceš pripojiť k vlastnému projektu, urob aj bod **a** a hodnoty v `firebase-config.js` nahraď svojimi.

**a) Vytvorenie vlastného projektu**
1. Na <https://console.firebase.google.com> vytvor nový projekt (Google Analytics nepotrebuješ).
2. V **Project settings → Your apps** pridaj webovú appku (`</>`) a skopíruj objekt `firebaseConfig` do `studyhub/firebase-config.js`.

**b) Zapnutie služieb v konzole Firebase** (v ľavom menu **Build**)
1. **Authentication → Get started → Sign-in method**: zapni **Email/Password** a **Google**.
2. **Firestore Database → Create database**: vyber *Production mode* a najbližšiu lokalitu (napr. `eur3`).
3. **Storage → Get started** (len ak chceš nahrávať súbory, pozri poznámku nižšie).

**c) Pravidlá (nevynechaj, bez nich appka nič neuloží)**
1. **Firestore Database → Rules**: vymaž obsah, vlož celý súbor `studyhub/firestore.rules` a klikni **Publish**.
2. **Storage → Rules**: to isté so súborom `studyhub/storage.rules`.

> **Poznámka k súborom:** Firebase Storage vyžaduje plán **Blaze** (platba podľa spotreby, treba pripojiť kartu). Malé použitie sa zmestí do bezplatnej kvóty a v konzole si môžeš nastaviť rozpočtové upozornenie. Bez Storage fungujú poznámky a odkazy normálne, len nahrávanie súborov nie.

### 3. Spusti stránku
V priečinku `studyhub/` spusti lokálny server:
```
python3 -m http.server 8000
```
Na Windowse môže fungovať `py -m http.server 8000`. Potom otvor v prehliadači <http://localhost:8000>.

Dvojklik na `index.html` nefunguje, appka používa ES moduly a tie prehliadač z lokálneho súboru nenačíta. Namiesto Pythonu môžeš použiť aj rozšírenie **Live Server** vo VS Code.

### 4. Vyskúšaj
1. Klikni na **Zaregistruj sa** (alebo použi prihlásenie cez Google).
2. Klikni na **+ Pridať** a vytvor poznámku, odkaz alebo súbor.
3. V konzole Firebase v **Firestore Database → Data** nájdeš kolekciu `users`, v nej dokument s tvojím ID a podkolekciu `items` s položkami. Zoznam používateľov je v **Authentication → Users**, súbory v **Storage → Files**. Kolekcia `users` sa objaví až po prvom prihlásení.

## Nasadenie na internet

**Firebase Hosting** (odporúčané, je v tom istom projekte):
```
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```
Pri `firebase init` vyber existujúci projekt. Súbor `firebase.json` je už pripravený, stránka je v aktuálnom priečinku.

**GitHub Pages**: v nastaveniach repozitára (**Settings → Pages**) zapni Pages. Keďže appka je v podpriečinku `studyhub/`, nasaď ju radšej cez Firebase Hosting, alebo presuň jej súbory do koreňa vetvy, z ktorej Pages publikujú.

Po nasadení pridaj novú doménu do **Authentication → Settings → Authorized domains**, inak nebude fungovať prihlásenie cez Google.

## Riešenie problémov

| Problém | Riešenie |
|---|---|
| Stránka sa zobrazí prázdna alebo hlási chybu modulov | Nespúšťaj ju dvojklikom, použi lokálny server (krok 3) |
| „Nemáš oprávnenie“ alebo `permission-denied` | Nie sú publikované pravidlá v Firestore alebo Storage (krok 2c) |
| Prihlásenie cez Google nefunguje | Zapni Google v Authentication a skontroluj *Authorized domains* |
| Nahrávanie súboru zlyhá | Storage nie je zapnuté alebo chýba plán Blaze |
| Úvodná obrazovka hlási, že Firebase nie je nastavený | V `firebase-config.js` zostali zástupné hodnoty `VLOZ_SEM` |

## Ďalšie nápady

Zoznam možných rozšírení (FastAPI backend, štatistiky, študijný plán, export do PDF) je v súbore [`STUDY HUB SPRINT.md`](STUDY%20HUB%20SPRINT.md). Podrobnejšia dokumentácia samotnej appky je v [`studyhub/README.md`](studyhub/README.md).
