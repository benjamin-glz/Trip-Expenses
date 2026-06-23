# ✈ Trip Expenses

Application web full-Python pour visualiser et comparer les dépenses de voyages.

## Stack

| Couche | Technologie |
|--------|-------------|
| Backend | FastAPI + Uvicorn |
| Base de données | SQLite via SQLModel |
| Parsing CSV | Pandas |
| Frontend | Alpine.js + Chart.js (intégré dans le HTML, aucun build) |

## Structure du projet

```
trip-expenses/
├── app/
│   ├── __init__.py
│   ├── main.py          # Routes FastAPI
│   ├── database.py      # Connexion SQLite
│   ├── models.py        # Modèles ORM (Trip, Expense)
│   ├── crud.py          # Opérations DB + calcul analytique
│   └── csv_parser.py    # Parsing du CSV de dépenses
├── templates/
│   └── index.html       # UI complète (Alpine.js + Chart.js)
├── requirements.txt
└── README.md
```

## Installation et lancement

### 1. Prérequis

- Python 3.10 ou supérieur
- `pip` à jour

### 2. Créer un environnement virtuel

```bash
cd trip-expenses
python -m venv .venv

# Linux / macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Lancer le serveur

```bash
uvicorn app.main:app --reload
```

L'application est accessible sur **http://localhost:8000**

> `--reload` active le rechargement automatique lors des modifications de code.

---

## Utilisation

1. Cliquer sur **Nouveau voyage** dans la barre latérale
2. Renseigner le nom du voyage et le budget quotidien en euros
3. Importer le fichier CSV (séparateur `;`)
4. Les graphiques s'affichent automatiquement :
   - **Budget quotidien** : dépenses réelles jour par jour vs budget prévu
   - **Répartition par catégorie** : donut chart en pourcentage
5. Pour **comparer deux voyages**, sélectionner un second voyage dans la barre de comparaison

## Format CSV attendu

Séparateur `;`, colonnes attendues :

```
amount;amountInHomeCurrency;category;conversionRate;country;countryCode;
datePaid;homeCurrency;localCurrency;notes;paidBy;paidFor;paymentMethod;
place;latitude;longitude;type;numberOfDays;excludeFromAvg;addToBudget;
categoryIcon;categoryColor;paymentMethodIcon;paymentMethodColor;...
```

> La colonne `numberOfDays` est utilisée uniquement pour la catégorie **Hébergements**
> afin de calculer un prix moyen par nuit.

## API disponible

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/trips` | Liste des voyages |
| `POST` | `/api/trips` | Créer un voyage + importer CSV |
| `DELETE` | `/api/trips/{id}` | Supprimer un voyage |
| `GET` | `/api/trips/{id}/analytics` | Données analytiques pour les graphiques |
| `GET` | `/api/trips/{id}/expenses` | Liste brute des dépenses |

La base de données `trips.db` est créée automatiquement au premier lancement dans le dossier racine.