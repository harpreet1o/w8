import express, { json } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oidc";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Express app
const router = express.Router();

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.uri)
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("MongoDB connected successfully");
});

// Define Mongoose schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Configure the Google strategy for use by Passport
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/oauth2/redirect/google",
      scope: ["profile"],
    },
    async (isssuer, profile, cb) => {
      try {
        // Check if a user with the username exists
        let user = await User.findOne({ username: profile.displayName }).exec();

        if (!user) {
          // If user does not exist, create a new user
          user = new User({ username: profile.displayName });
          await user.save();
        }

        // Pass user object to passport callback
        return cb(null, user);
      } catch (err) {
        return cb(err);
      }
    }
  )
);

// Configure Passport session management
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await User.findById(id).exec();
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});



router.get("/login/federated/google", passport.authenticate("google"));

router.get(
  "/oauth2/redirect/google",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

router.post('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

export default router;
