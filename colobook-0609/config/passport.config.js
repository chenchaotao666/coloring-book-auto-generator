const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findUserByEmail, createGoogleUser } = require('../models/user.model');
const envConfig = require('./env.config');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const connection = await require('../config/db.config').getConnection();
  const [results] = await connection.query('SELECT * FROM users WHERE _id = ?', [id]);
  done(null, results[0] || null);
});

passport.use(new GoogleStrategy({
  clientID: envConfig.GOOGLE_CLIENT_ID,
  clientSecret: envConfig.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/api/auth/google/callback',
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  const profileEmail = profile.emails[0].value;
  const existingUser = await findUserByEmail(profileEmail);

  if (existingUser) {
    return done(null, existingUser);
  } else {
    const newUser = {
      username: profile.displayName,
      email: profileEmail,
      googleId: profile.id
    };
    const userId = await createGoogleUser(newUser);
    return done(null, { ...newUser, id: userId });
  }
}));

module.exports = passport;