import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Specify the path to the environment variable file 'config.env'
dotenv.config({ path: './.env' });

const app = express();
app.use(cors()); 

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

app.use('/companies', companyRouter);

// async function to connect to DB
async function connectDB() {
  try {
    await mongoose.connect(process.env.DB);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

function startServer() {
  const HOSTNAME = "localhost";
  const PORT = Number(process.env.PORT) || 8000;

  app.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
  });
}


// call connectDB first and when connection is ready, start the web server
connectDB().then(startServer);

// startServer();