import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import { google } from "googleapis";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Google OAuth setup ---
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // e.g. https://traceable-link.onrender.com/auth/callback

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// --- Session setup ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

// --- Step 1: Incoming tracking link ---
app.get("/", (req, res) => {
  const { sop, sopName, target } = req.query;

  if (!req.session.user) {
    // Save state for after login
    req.session.pending = { sop, sopName, target };

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
    });

    return res.redirect(url);
  }

  // If already logged in → go straight to redirect
  res.redirect(`/go`);
});

// --- Step 2: OAuth callback ---
app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch user info
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const userinfo = await oauth2.userinfo.get();

  req.session.user = {
    email: userinfo.data.email,
    name: userinfo.data.name,
  };

  return res.redirect("/go");
});

// --- Step 3: Logging + redirect to Coda ---
app.get("/go", async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const { sop, sopName, target } = req.session.pending || {};
  const { email, name } = req.session.user;

  // ✅ Example logging (to console for now)
  console.log("CLICK LOG:", {
    sop,
    sopName,
    target,
    email,
    name,
    date: new Date().toISOString(),
  });

  // TODO: send this log to Coda / Google Sheets / DB

  // Redirect to Coda doc
  res.redirect(decodeURIComponent(target));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
