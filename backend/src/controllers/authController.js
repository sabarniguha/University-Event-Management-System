
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prismaClient");
const { signToken } = require("../utils/jwt");
const {
  isValidEmail,
  isValidPassword,
  isNonEmptyString,
} = require("../utils/validators");

const SALT_ROUNDS = 10;

/**
 * Strips passwordHash before sending a user object to the client.
 */
function toPublicUser(user) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

// POST /api/auth/register
// Public registration can create STUDENT, ORGANIZER, or ADMIN accounts.
// The frontend will provide the intended role.
async function register(req, res, next) {
  try {
    const {
      name,
      email,
      studentId,
      department,
      phone,
      password,
      confirmPassword,
      role,
    } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        message: "Please enter your full name.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    // Only these roles are allowed to be created.
    const allowedRoles = ["STUDENT", "ORGANIZER", "ADMIN"];

    // Default to STUDENT if no role is provided.
    const normalizedRole = isNonEmptyString(role)
      ? role.trim().toUpperCase()
      : "STUDENT";

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid account role.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    if (studentId) {
      const existingStudentId = await prisma.user.findUnique({
        where: { studentId },
      });

      if (existingStudentId) {
        return res.status(409).json({
          message: "An account with this Student ID already exists.",
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: normalizedRole,
        studentId: studentId || null,
        department: department || null,
        phone: phone || null,
      },
    });

    return res.status(201).json({
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        message: "Invalid email or password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = signToken({
      id: user.id,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(401).json({
        message: "Your session has expired. Please log in again.",
      });
    }

    return res.status(200).json({
      user: toPublicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
};

