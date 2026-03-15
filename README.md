# TieBreaker

TieBreaker is a group decision-making app that helps friends decide what to eat, what to watch, or what activity to do — without the endless back-and-forth in the group chat.

A host creates a session and shares a 4-digit code. Everyone joins and votes yes or no on options. TieBreaker reveals what the group agreed on — and if there's a tie, it picks one randomly.

---

## The Problem

Group decisions are hard. Nobody wants to be "the one" who picks. People say "I don't care" but actually do care. Plans die in the group chat.

TieBreaker fixes this by making voting anonymous — no one sees how anyone else voted until the result is revealed.

---

## Features

- Host creates a session, guests join with a 4-digit code
- Anonymous yes/no voting on 10 options
- Three categories: Food, Movies, and Activities
- Movies pulled from The Movie Database (TMDB) API
- Food and Activities use curated local options
- Match detection — shows what everyone agreed on
- If there's a tie, the host can randomize a final pick
- Sessions automatically delete after 24 hours

---

## How It Works

1. Register or log in at the home page
2. Pick a category from the dashboard (Food, Movies, or Activities)
3. Share the 4-digit code with your group
4. Everyone joins the lobby using the code
5. Host clicks Start once 2 or more people are in
6. Each person votes yes or no on 10 options
7. TieBreaker shows the result once everyone finishes

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Auth:** JWT + bcryptjs
- **Movies API:** TMDB

---

## Project Structure

```
TieBreaker/
├── src/
│   ├── client/                  # All frontend pages
│   │   ├── styles.css           # Shared stylesheet
│   │   ├── index.html           # Landing / login page
│   │   ├── about.html
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── forgotpassword.html
│   │   ├── dashboard.html
│   │   ├── hostfood.html        # Host lobby — Food
│   │   ├── hostmovies.html      # Host lobby — Movies
│   │   ├── hostactivities.html  # Host lobby — Activities
│   │   ├── joinsession.html     # Guest lobby
│   │   ├── votefood.html        # Voting — Food
│   │   ├── votemovies.html      # Voting — Movies
│   │   ├── voteactivities.html  # Voting — Activities
│   │   └── results.html         # Results (all categories)
│   └── server/                  # Backend
│       ├── controllers/
│       │   ├── authController.js
│       │   └── sessionController.js
│       ├── models/
│       │   ├── User.js
│       │   └── Session.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   └── sessionRoutes.js
│       ├── utils/
│       │   └── geoService.js
│       └── app.js
├── .env
├── package.json
└── README.md
```

---

## Running the App Locally

**Requirements**
- Node.js
- A free MongoDB Atlas account

**Steps**

1. Clone the repo
```bash
git clone https://github.com/your-username/tiebreaker.git
cd tiebreaker
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root folder
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_random_string
TMDB_API_KEY=your_tmdb_key
GEOCODIO_API_KEY=your_geocodio_key
```

4. Start the server
```bash
node src/server/app.js
```

5. Open `src/client/index.html` in your browser

> In MongoDB Atlas, set Network Access to `0.0.0.0/0` so your machine can connect from any IP.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Login |
| POST | `/api/session/create` | Create a new session |
| POST | `/api/session/join` | Join a session |
| GET  | `/api/session/:pin` | Get session info |
| PUT  | `/api/session/start/:pin` | Host starts the session |
| GET  | `/api/session/:pin/movies` | Get movies from TMDB |
| POST | `/api/session/:pin/vote` | Submit votes |
| GET  | `/api/session/:pin/results` | Get results |
| POST | `/api/session/:pin/pick` | Host sets the final pick |

---

## Future Ideas

- Forgot password / email reset
- Real-time updates with WebSockets instead of polling
- Use live location and an API to find nearby restaurants and activities
- Midpoint calculation of nearby restaurants and activities instead of being based on host location
- Decision history so you can look back at past sessions
- Mobile app
- Profile section to customize or update user information
- Add subcategories for each mode, such as cuisine type, price, horror, etc...

---

## Authors

Built by **Christopher Bogash** and **Kevin Aguilar** as a senior capstone project.