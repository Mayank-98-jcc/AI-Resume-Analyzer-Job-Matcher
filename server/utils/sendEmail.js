function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in server/.env`);
  }
  return value;
}

function stripWrappingQuotes(value = "") {
  const text = String(value);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

let cachedTransporter = null;
let cachedFrom = null;
let verifyStarted = false;

function getTransporter() {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, from: cachedFrom };
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      const moduleError = new Error(
        "Email provider module is missing. Install nodemailer or set EMAIL_MODE=console/disabled."
      );
      moduleError.code = "EMAIL_MODULE_MISSING";
      throw moduleError;
    }
    throw error;
  }

  const host = requireEnv("SMTP_HOST");
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const from = stripWrappingQuotes(process.env.SMTP_FROM || user);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass }
  });

  cachedTransporter = transporter;
  cachedFrom = from;

  if (!verifyStarted) {
    verifyStarted = true;
    transporter.verify((error) => {
      if (error) {
        console.log("SMTP verify failed:", error.message || error);
      } else {
        console.log("SMTP Server is ready");
      }
    });
  }

  return { transporter, from };
}

const sendEmail = async (to, subject, text) => {
  const mode = String(process.env.EMAIL_MODE || "").trim().toLowerCase();
  if (mode === "console") {
    console.log("\n--- EMAIL (console mode) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text);
    console.log("--- END EMAIL ---\n");
    return;
  }
  if (mode === "disabled") {
    return;
  }

  const { transporter, from } = getTransporter();
  await transporter.sendMail({ from, to, subject, text });
};

module.exports = sendEmail;
