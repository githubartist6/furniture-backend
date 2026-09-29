const User = require("../models/User");
const Cart = require("../models/Cart");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const {
  randomInt,
  randomBytes,
  createHash,
} = crypto;

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (email = "") => {
  return String(email).trim().toLowerCase();
};

const normalizePhone = (phone = "") => {
  return String(phone).replace(/\D/g, "");
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const hashValue = (value) => {
  return createHash("sha256")
    .update(String(value))
    .digest("hex");
};

// ======================================================
// CONSTANTS
// ======================================================

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_DAILY_LIMIT = 5;
const OTP_MAX_ATTEMPTS = 5;

const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes;

// ======================================================
// TIMING SAFE HASH COMPARISON
// ======================================================

const safeCompareHash = (value, storedHash) => {
  if (!value || !storedHash) {
    return false;
  }

  const valueHash = hashValue(value);

  const valueBuffer = Buffer.from(valueHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (valueBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    valueBuffer,
    storedBuffer
  );
};

// ======================================================
// JWT
// ======================================================

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in environment variables"
    );
  }

  return jwt.sign(
    {
      userId: String(userId),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ======================================================
// COOKIE
// ======================================================

const setTokenCookie = (res, token) => {
  const isProduction =
    process.env.NODE_ENV === "production";

  res.cookie("furniture_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearTokenCookie = (res) => {
  const isProduction =
    process.env.NODE_ENV === "production";

  res.clearCookie("furniture_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });
};

// ======================================================
// SMTP
// ======================================================

const createTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  console.log("========== SMTP CONFIG ==========");
  console.log("SMTP_HOST:", SMTP_HOST || "MISSING");
  console.log("SMTP_PORT:", SMTP_PORT || "MISSING");
  console.log("SMTP_USER:", SMTP_USER || "MISSING");
  console.log(
    "SMTP_PASS:",
    SMTP_PASS ? "PRESENT" : "MISSING"
  );
  console.log("=================================");

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    throw new Error(
      "SMTP configuration is incomplete in environment variables"
    );
  }

  const port = Number(SMTP_PORT);

  if (!Number.isInteger(port)) {
    throw new Error(
      "SMTP_PORT must be a valid number"
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: port,
    secure: port === 465,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// ======================================================
// SIGNUP
// ======================================================

const signupUser = async (req, res) => {
  try {
    const {
      username,
      name,
      email,
      password,
      phone,
    } = req.body;

    // --------------------------------------------------
    // REQUIRED FIELDS
    // --------------------------------------------------

    if (!username || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username, name, email and password are required",
      });
    }

    // --------------------------------------------------
    // CLEAN DATA
    // --------------------------------------------------

    const cleanUsername = String(username).trim();
    const cleanName = String(name).trim();
    const cleanEmail = normalizeEmail(email);
    const cleanPhone = normalizePhone(phone);

    // --------------------------------------------------
    // VALIDATE USERNAME
    // --------------------------------------------------

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 50
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be between 3 and 50 characters",
      });
    }

    if (!/^[A-Za-z0-9_@-]+$/.test(cleanUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username can contain only letters, numbers, _, @ and -",
      });
    }

    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // --------------------------------------------------
    // PASSWORD VALIDATION
    // --------------------------------------------------

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    // --------------------------------------------------
    // CHECK EXISTING EMAIL / USERNAME
    // --------------------------------------------------

    const existingEmail = await User.findOne({
      email: cleanEmail,
    });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingUsername = await User.findOne({
      username: cleanUsername,
    });

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    // --------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(
      String(password),
      12
    );

    // --------------------------------------------------
    // CREATE USER
    // --------------------------------------------------

    const user = await User.create({
      username: cleanUsername,
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
    });

    // --------------------------------------------------
    // CREATE CART
    // --------------------------------------------------

    try {
      await Cart.create({
        userId: user._id,
        email: user.email,
        items: [],
      });
    } catch (cartError) {
      console.error(
        "Cart creation error:",
        cartError
      );

      // User already exists, so don't fail signup
      // only because cart creation failed.
    }

    // --------------------------------------------------
    // JWT
    // --------------------------------------------------

    const token = generateToken(user._id);

    setTokenCookie(res, token);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Account created successfully",

      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(
      "Signup Error:",
      error
    );

    // Handle duplicate key errors
    if (error.code === 11000) {
      const duplicateField =
        Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: `${duplicateField || "Value"} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// ======================================================
// LOGIN
// ======================================================

const loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --------------------------------------------------
    // COMPARE PASSWORD
    // --------------------------------------------------

    const passwordMatch =
      await bcrypt.compare(
        String(password),
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // --------------------------------------------------
    // JWT
    // --------------------------------------------------

    const token = generateToken(user._id);

    setTokenCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",

      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// ======================================================
// LOGOUT
// ======================================================

const logoutUser = async (req, res) => {
  try {
    clearTokenCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(
      "Logout Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// ======================================================
// GET PROFILE
// ======================================================

const getProfile = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile",
    });
  }
};

// ======================================================
// UPDATE PROFILE
// ======================================================

const updateProfile = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?._id ||
      req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      name,
      phone,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // --------------------------------------------------
    // UPDATE NAME
    // --------------------------------------------------

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Name must be at least 2 characters",
        });
      }

      user.name = cleanName;
    }

    // --------------------------------------------------
    // UPDATE PHONE
    // --------------------------------------------------

    if (phone !== undefined) {
      user.phone = normalizePhone(phone);
    }

    await user.save();

    const updatedUser =
      await User.findById(userId)
        .select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// ======================================================
// REQUEST FORGOT PASSWORD OTP
// ======================================================

const requestForgotPasswordOTP = async (req, res) => {
  let transporter = null;

  try {
    const { email } = req.body;

    // --------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // --------------------------------------------------
    // FIND USER IN DATABASE
    // IMPORTANT:
    // OTP WILL ONLY BE SENT IF THIS EMAIL EXISTS
    // --------------------------------------------------

    const user = await User.findOne({
      email: cleanEmail,
    });

    // --------------------------------------------------
    // EMAIL DOES NOT EXIST IN DATABASE
    // DO NOT GENERATE OTP
    // DO NOT SEND EMAIL
    // --------------------------------------------------

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    // --------------------------------------------------
    // CURRENT TIME
    // --------------------------------------------------

    const now = Date.now();

    // ==================================================
    // 60 SECOND RESEND COOLDOWN
    // ==================================================

    const lastSentAt = user.resetPasswordLastOtpSentAt
      ? new Date(user.resetPasswordLastOtpSentAt).getTime()
      : 0;

    if (
      lastSentAt &&
      now - lastSentAt < OTP_RESEND_COOLDOWN_MS
    ) {
      const remainingSeconds = Math.ceil(
        (
          OTP_RESEND_COOLDOWN_MS -
          (now - lastSentAt)
        ) / 1000
      );

      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
        remainingSeconds,
      });
    }

    // ==================================================
    // DAILY OTP LIMIT
    // ==================================================

    let dailyCount = Number(
      user.resetPasswordOtpDailyCount || 0
    );

    let dailyResetAt = user.resetPasswordOtpDailyResetAt
      ? new Date(
        user.resetPasswordOtpDailyResetAt
      ).getTime()
      : 0;

    // Start a new 24-hour window
    if (!dailyResetAt || now >= dailyResetAt) {
      dailyCount = 0;
      dailyResetAt =
        now + 24 * 60 * 60 * 1000;
    }

    if (dailyCount >= OTP_DAILY_LIMIT) {
      const remainingMs =
        dailyResetAt - now;

      const remainingHours = Math.ceil(
        remainingMs / (60 * 60 * 1000)
      );

      return res.status(429).json({
        success: false,
        message: `Daily OTP limit reached. Try again in approximately ${remainingHours} hour(s).`,
      });
    }

    // ==================================================
    // GENERATE OTP
    // ==================================================

    const otp = String(
      randomInt(100000, 1000000)
    );

    const otpHash = hashValue(otp);

    // ==================================================
    // SAVE OTP DATA
    // ==================================================

    user.resetPasswordOtpHash = otpHash;

    user.resetPasswordOtpExpires =
      new Date(
        now + OTP_EXPIRY_MS
      );

    user.resetPasswordOtpAttempts = 0;

    user.resetPasswordLastOtpSentAt =
      new Date(now);

    user.resetPasswordOtpDailyCount =
      dailyCount + 1;

    user.resetPasswordOtpDailyResetAt =
      new Date(dailyResetAt);

    // New OTP invalidates old reset token
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordTokenExpires = undefined;

    await user.save();

    // ==================================================
    // CREATE SMTP TRANSPORTER
    // ==================================================

    transporter = createTransporter();

    // ==================================================
    // SEND OTP ONLY TO DATABASE USER EMAIL
    // ==================================================

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Your Password Reset OTP",

      text: `
Password Reset Request

Hello ${user.name || "there"},

We received a request to reset the password for your account.

Your Password Reset OTP is: ${otp}

This OTP is valid for 10 minutes.

IMPORTANT:
Never share this OTP with anyone.
Our support team will never ask for your OTP or password.

If you did not request this password reset, you can safely ignore this email.

Regards,
Support Team
      `,

      html: `
<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Password Reset OTP</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f3f4f6;
  font-family:Arial,Helvetica,sans-serif;
  color:#111827;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      background-color:#f3f4f6;
      padding:40px 15px;
    "
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:580px;
            background-color:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:16px;
            overflow:hidden;
          "
        >

          <!-- Top Accent -->
          <tr>
            <td style="
              height:5px;
              background-color:#111827;
              font-size:0;
              line-height:0;
            ">
              &nbsp;
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="
              padding:34px 38px 25px 38px;
              border-bottom:1px solid #f0f1f3;
            ">

              <div style="
                display:inline-block;
                padding:6px 10px;
                background-color:#f3f4f6;
                border-radius:6px;
                font-size:11px;
                font-weight:700;
                color:#6b7280;
                letter-spacing:1px;
                margin-bottom:14px;
              ">
                ACCOUNT SECURITY
              </div>

              <h1 style="
                margin:0;
                font-size:27px;
                line-height:1.3;
                font-weight:700;
                color:#111827;
              ">
                Reset your password
              </h1>

              <p style="
                margin:10px 0 0 0;
                font-size:13px;
                line-height:1.6;
                color:#6b7280;
              ">
                Use the verification code below to securely continue.
              </p>

            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="
              padding:30px 38px 35px 38px;
            ">

              <p style="
                margin:0 0 8px 0;
                font-size:16px;
                line-height:1.6;
                font-weight:600;
                color:#111827;
              ">
                Hello ${user.name || "there"},
              </p>

              <p style="
                margin:0 0 25px 0;
                font-size:15px;
                line-height:1.7;
                color:#4b5563;
              ">
                We received a request to reset the password for your account.
                Enter the verification code below to continue.
              </p>

              <!-- OTP Box -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color:#f8fafc;
                  border:1px solid #e5e7eb;
                  border-radius:12px;
                  margin-bottom:20px;
                "
              >
                <tr>
                  <td align="center" style="
                    padding:26px 15px;
                  ">

                    <div style="
                      font-size:11px;
                      font-weight:700;
                      color:#6b7280;
                      letter-spacing:1.2px;
                      margin-bottom:12px;
                    ">
                      VERIFICATION CODE
                    </div>

                    <div style="
                      font-size:30px;
                      line-height:40px;
                      font-weight:700;
                      letter-spacing:8px;
                      color:#111827;
                      white-space:nowrap;
                    ">
                      ${otp}
                    </div>

                    <div style="
                      margin-top:10px;
                      font-size:12px;
                      color:#6b7280;
                    ">
                      Expires in 10 minutes
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color:#fff7ed;
                  border:1px solid #fed7aa;
                  border-radius:10px;
                  margin-bottom:20px;
                "
              >
                <tr>
                  <td style="
                    padding:16px;
                    font-size:13px;
                    line-height:1.65;
                    color:#9a3412;
                  ">
                    <strong>
                      🔒 Never share this OTP with anyone.
                    </strong>
                    <br />
                    Our support team will never ask for your OTP,
                    password, or security credentials.
                  </td>
                </tr>
              </table>

              <!-- Security Tips -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color:#f9fafb;
                  border:1px solid #eef0f3;
                  border-radius:10px;
                  margin-bottom:25px;
                "
              >
                <tr>
                  <td style="
                    padding:17px 18px;
                  ">

                    <div style="
                      font-size:13px;
                      font-weight:700;
                      color:#111827;
                      margin-bottom:8px;
                    ">
                      Security tips
                    </div>

                    <div style="
                      font-size:12px;
                      line-height:1.7;
                      color:#6b7280;
                    ">
                      • Never forward this OTP to anyone.<br />
                      • Do not share your password with anyone.<br />
                      • This OTP is valid only for 10 minutes.
                    </div>

                  </td>
                </tr>
              </table>

              <p style="
                margin:0;
                padding-top:22px;
                border-top:1px solid #eef0f3;
                font-size:13px;
                line-height:1.7;
                color:#6b7280;
              ">
                If you did not request a password reset, you can safely
                ignore this email. No changes will be made to your account.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding:22px 38px;
              background-color:#fafafa;
              border-top:1px solid #eef0f3;
              text-align:center;
            ">

              <p style="
                margin:0;
                font-size:12px;
                line-height:1.6;
                color:#9ca3af;
              ">
                This is an automated security email.
                Please do not reply to this message.
              </p>

              <p style="
                margin:8px 0 0 0;
                font-size:11px;
                color:#b0b5bd;
              ">
                © ${new Date().getFullYear()} Furniture
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
      `,
    });

    // ==================================================
    // SUCCESS
    // ==================================================

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your registered email address.",
    });

  } catch (error) {

    console.error(
      "Request Forgot Password OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to send OTP right now. Please try again later.",
    });

  } finally {

    if (transporter) {
      transporter.close();
    }
  }
};

// ======================================================
// VERIFY FORGOT PASSWORD OTP
// ======================================================

const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const {
      email,
      otp,
    } = req.body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const cleanEmail =
      normalizeEmail(email);

    const cleanOtp =
      String(otp).trim();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // --------------------------------------------------
    // CHECK OTP EXISTS
    // --------------------------------------------------

    if (
      !user.resetPasswordOtpHash ||
      !user.resetPasswordOtpExpires
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // --------------------------------------------------
    // CHECK EXPIRY
    // --------------------------------------------------

    const expiryTime =
      new Date(
        user.resetPasswordOtpExpires
      ).getTime();

    if (
      !Number.isFinite(expiryTime) ||
      Date.now() >= expiryTime
    ) {
      // Invalidate expired OTP
      user.resetPasswordOtpHash =
        undefined;

      user.resetPasswordOtpExpires =
        undefined;

      user.resetPasswordOtpAttempts =
        0;

      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // --------------------------------------------------
    // CHECK MAX ATTEMPTS
    // --------------------------------------------------

    if (
      Number(
        user.resetPasswordOtpAttempts || 0
      ) >= OTP_MAX_ATTEMPTS
    ) {
      user.resetPasswordOtpHash =
        undefined;

      user.resetPasswordOtpExpires =
        undefined;

      user.resetPasswordOtpAttempts =
        0;

      await user.save();

      return res.status(429).json({
        success: false,
        message:
          "Too many incorrect OTP attempts. Please request a new OTP.",
      });
    }

    // --------------------------------------------------
    // COMPARE OTP
    // --------------------------------------------------

    const otpValid =
      safeCompareHash(
        cleanOtp,
        user.resetPasswordOtpHash
      );

    if (!otpValid) {
      user.resetPasswordOtpAttempts =
        Number(
          user.resetPasswordOtpAttempts || 0
        ) + 1;

      const attemptsLeft =
        Math.max(
          0,
          OTP_MAX_ATTEMPTS -
          user.resetPasswordOtpAttempts
        );

      // Invalidate after final failed attempt
      if (
        user.resetPasswordOtpAttempts >=
        OTP_MAX_ATTEMPTS
      ) {
        user.resetPasswordOtpHash =
          undefined;

        user.resetPasswordOtpExpires =
          undefined;

        user.resetPasswordOtpAttempts =
          0;

        await user.save();

        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
        attemptsLeft,
      });
    }

    // ==================================================
    // OTP IS CORRECT
    // ==================================================

    // Generate secure temporary reset token
    const resetToken =
      randomBytes(32).toString("hex");

    const resetTokenHash =
      hashValue(resetToken);

    // --------------------------------------------------
    // SAVE RESET TOKEN
    // --------------------------------------------------

    user.resetPasswordTokenHash =
      resetTokenHash;

    user.resetPasswordTokenExpires =
      new Date(
        Date.now() +
        RESET_TOKEN_EXPIRY_MS
      );

    // --------------------------------------------------
    // IMPORTANT:
    // OTP IS ONE-TIME USE
    // --------------------------------------------------

    user.resetPasswordOtpHash =
      undefined;

    user.resetPasswordOtpExpires =
      undefined;

    user.resetPasswordOtpAttempts =
      0;

    await user.save();

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "OTP verified successfully",

      resetToken,
    });
  } catch (error) {
    console.error(
      "Verify Forgot Password OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP",
    });
  }
};

// ======================================================
// RESET FORGOT PASSWORD
// ======================================================

const resetForgotPassword = async (req, res) => {
  try {
    const {
      email,
      resetToken,
      newPassword,
    } = req.body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (
      !email ||
      !resetToken ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, reset token and new password are required",
      });
    }

    const cleanEmail =
      normalizeEmail(email);

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid email address",
      });
    }

    if (
      String(newPassword).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token",
      });
    }

    // --------------------------------------------------
    // CHECK TOKEN EXISTS
    // --------------------------------------------------

    if (
      !user.resetPasswordTokenHash ||
      !user.resetPasswordTokenExpires
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token",
      });
    }

    // --------------------------------------------------
    // CHECK TOKEN EXPIRY
    // --------------------------------------------------

    const tokenExpiry =
      new Date(
        user.resetPasswordTokenExpires
      ).getTime();

    if (
      !Number.isFinite(tokenExpiry) ||
      Date.now() >= tokenExpiry
    ) {
      user.resetPasswordTokenHash =
        undefined;

      user.resetPasswordTokenExpires =
        undefined;

      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "Reset token has expired. Please request a new OTP.",
      });
    }

    // --------------------------------------------------
    // VERIFY TOKEN
    // --------------------------------------------------

    const tokenValid =
      safeCompareHash(
        String(resetToken).trim(),
        user.resetPasswordTokenHash
      );

    if (!tokenValid) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token",
      });
    }

    // ==================================================
    // HASH NEW PASSWORD
    // ==================================================

    const hashedPassword =
      await bcrypt.hash(
        String(newPassword),
        12
      );

    user.password =
      hashedPassword;

    // ==================================================
    // IMPORTANT:
    // RESET TOKEN IS ONE-TIME USE
    // ==================================================

    user.resetPasswordTokenHash =
      undefined;

    user.resetPasswordTokenExpires =
      undefined;

    // Also make sure no OTP remains
    user.resetPasswordOtpHash =
      undefined;

    user.resetPasswordOtpExpires =
      undefined;

    user.resetPasswordOtpAttempts =
      0;

    await user.save();

    // --------------------------------------------------
    // CLEAR LOGIN COOKIE
    // --------------------------------------------------

    clearTokenCookie(res);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset Forgot Password Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while resetting password",
    });
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  signupUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
  requestForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgotPassword,
};