import "dotenv/config.js";
import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import session from "express-session";
import RedisStore from "connect-redis";
import redis from 'redis';
import passport from "passport";
import indexRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";

// Constants
const port = process.env.PORT || 3000;

// Create express app
const app = express();

// view engine setup
app.set("views", path.resolve("views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.resolve("public")));

(async () => {
  // Create Redis client
  const client = redis.createClient();

  client.on("error", (error) => console.error(`Redis Client Error: ${error}`));

  await client.connect();
  console.log('Redis client connected successfully.');

  // Use the session middleware
  app.use(session({
    store: new RedisStore({ client: client }),
    secret: 'keyboard cat',
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
      maxAge: 1000 * 60 * 60 * 24 // Session expires after 1 day
    }
  }));

  // Initialize Passport and session
  app.use(passport.initialize());
  app.use(passport.session());

  // Define routes
  app.use("/", indexRouter);
  app.use("/", authRouter);

  // Example route to print all sessions
  app.get("/print-sessions", (req, res) => {
    const sessionStore = req.sessionStore;
    sessionStore.all((error, sessions) => {
      if (error) {
        console.error("Failed to retrieve sessions:", error);
        res.status(500).send("Failed to retrieve sessions.");
        return;
      }
      res.send(sessions);
    });
  });

  // Catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

  // Error handler
  app.use(function (err, req, res, next) {
    // Set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // Render the error page
    res.status(err.status || 500);
    res.render("error");
  });

  // Start server after Redis client is ready
  app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
  });

})();
