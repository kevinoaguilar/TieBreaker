# TieBreaker

A group decision-making app for food, movies, and activities. A host creates a session and shares a 4-digit code. Everyone joins and votes yes or no on 10 options. TieBreaker reveals what the group agreed on. If there's a tie, it picks randomly.

Built by **Christopher Bogash** and **Kevin Aguilar** as a senior capstone project.

Hosted on Render's free tier — the first request after a period of inactivity takes ~30 seconds while the service wakes up.

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Auth:** JWT + bcryptjs
- **Movies:** TMDB API
- **Food & Activities:** Yelp Fusion API

---

## How It Works

1. Register or log in
2. Pick a category — Food, Movies, or Activities
3. Share the 4-digit code with your group
4. Everyone joins the lobby with the code
5. Host starts once 2+ people are in
6. Each person votes yes or no on 10 options
7. TieBreaker reveals the result once everyone finishes — if it's a tie, the host randomizes a final pick

---

## Design Notes

Consistent ordering across clients. Participants load the option list independently, so a naive random shuffle would show everyone a different order and make vote tallies meaningless. Options are shuffled with a PRNG seeded on the session PIN, producing identical ordering for every client without any coordination between them.

Avoiding the empty-cache race. Clients poll session status every two seconds and redirect once the session goes active. Fetching API results after flipping that flag meant early clients could arrive before the cache was populated and see a different list. The session is now marked active only once the cache is written, so every participant is guaranteed the same populated result set.

Caching to control API cost. Yelp bills per call. Results are cached on the session document rather than refetched per participant, so a ten-person lobby costs the same number of API calls as a one-person lobby.

---

## Project Structure

```
TieBreaker/
├── src/
│   ├── client/
│   │   ├── styles.css
│   │   ├── index.html
│   │   ├── about.html
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── forgotpassword.html
│   │   ├── dashboard.html
│   │   ├── hostfood.html
│   │   ├── hostmovies.html
│   │   ├── hostactivities.html
│   │   ├── joinsession.html
│   │   ├── votefood.html
│   │   ├── votemovies.html
│   │   ├── voteactivities.html
│   │   ├── results.html
│   │   └── leave-handler.js
│   └── server/
│       ├── controllers/
│       │   ├── authController.js
│       │   └── sessionController.js
│       ├── models/
│       │   ├── Session.js
│       │   └── User.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   └── sessionRoutes.js
│       └── app.js
├── .env
├── package.json
└── README.md
```

---

## Running Locally

**Requirements:** Node.js, a MongoDB Atlas account, and free API keys from TMDB and Yelp Fusion.

```bash
git clone https://github.com/kevinoaguilar/tiebreaker.git
cd TieBreaker
npm install
```

Create a `.env` file:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=any_random_string
TMDB_API_KEY=your_tmdb_key
YELP_API_KEY=your_yelp_key
```

```bash
node src/server/app.js
```

Then open `hhtp://localhost:3000` in your browser. Express serves both the API and the frontend from a single origin, so there's no separate dev server to run.

> In MongoDB Atlas, set Network Access to `0.0.0.0/0` to allow connections from your machine.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Login |
| POST | `/api/session/create` | Create a session |
| POST | `/api/session/join` | Join a session |
| GET  | `/api/session/:pin` | Get session info |
| PUT  | `/api/session/start/:pin` | Start the session |
| GET  | `/api/session/:pin/movies` | Get movies from TMDB |
| GET  | `/api/session/:pin/food` | Get restaurants from Yelp |
| GET  | `/api/session/:pin/activities` | Get activities from Yelp |
| POST | `/api/session/:pin/vote` | Submit votes |
| GET  | `/api/session/:pin/results` | Get results |
| POST | `/api/session/:pin/pick` | Host sets the final pick |
| POST | `/api/session/:pin/leave` | Leave a session |

---

## Future Ideas

- Forgot password / email reset
- WebSockets instead of polling
- Midpoint location for food and activities (not just host location)
- Decision history
- Mobile app
- User profiles
- Subcategories (cuisine type, genre, price range, etc.)

---

## Attribution

Movie data provided by TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB. Business data provided by Yelp.
