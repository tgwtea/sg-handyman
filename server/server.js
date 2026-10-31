import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Specify the path to the environment variable file
// Load server/.env for local runs. On Vercel, env vars come from the project settings.
dotenv.config({ path: './.env' });

import companyRouter from './routes/company-routes.js';
import authRouter from './routes/auth-routes.js';
import timeslotRouter from './routes/timeslot-routes.js';
import bookingRouter from './routes/booking-routes.js';
import forumRouter from './routes/forum-routes.js';
import shopRouter from './routes/shop-routes.js';
import reviewRouter from './routes/review-routes.js';

const isVercel = !!process.env.VERCEL;

// Connect once and reuse the connection. Serverless instances keep it between requests.
let dbPromise;
function connectDB() {
  if (!dbPromise) {
    dbPromise = mongoose.connect(process.env.DB)
      .then(() => console.log("MongoDB connected successfully"))
      .catch((error) => {
        dbPromise = undefined; // let the next request try again
        throw error;
      });
  }
  return dbPromise;
}

const app = express();

// Vercel sits in front of the app as a proxy, so trust it for secure cookies
app.set('trust proxy', 1);

// Only needed when the Vue app runs on another origin (local dev without the Vite proxy).
// On Vercel the client and API share one domain.
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,  // set to false to avoid saving empty session objects, to save storage space
  cookie: { secure: false }
}));

import companyRouter from './routes/company-routes.js';
import authRouter from './routes/auth-routes.js';
import timeslotRouter from './routes/timeslot-routes.js';
import bookingRouter from './routes/booking-routes.js';
import forumRouter from './routes/forum-routes.js';
import shopRouter from './routes/shop-routes.js';
import reviewRouter from './routes/review-routes.js';
import mapRouter from './routes/map-routes.js';

app.use('/companies', companyRouter);
app.use('/auth', authRouter);
app.use('/timeslots', timeslotRouter);
app.use('/bookings', bookingRouter);
app.use('/forum', forumRouter);
app.use('/shop', shopRouter);
app.use('/reviews', reviewRouter);
app.use('/map', mapRouter);

// async function to connect to DB
async function connectDB() {

// Every API route lives under /api, the path Vercel sends to this service
const api = express.Router();

// Make sure the database is connected before any route runs
api.use(async (req, res, next) => {

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    res.status(503).send({ message: 'Database unavailable' });
  }
});

// Sessions live in MongoDB so every server instance sees the same logins.
// Created on first use, once the connection above is ready.
let sessionMiddleware;
api.use((req, res, next) => {
  sessionMiddleware ??= session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,  // set to false to avoid saving empty session objects, to save storage space
    store: MongoStore.create({ client: mongoose.connection.getClient() }),
    cookie: { secure: isVercel, httpOnly: true, sameSite: 'lax' }
  });
  sessionMiddleware(req, res, next);
});

api.use('/companies', companyRouter);
api.use('/auth', authRouter);
api.use('/timeslots', timeslotRouter);
api.use('/bookings', bookingRouter);
api.use('/forum', forumRouter);
api.use('/shop', shopRouter);
api.use('/reviews', reviewRouter);
app.use('/api', api);

// Vercel runs the exported app as a function; locally, start a normal server
if (!isVercel) {
  const PORT = Number(process.env.PORT) || 8000;
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/api`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

export default app;
