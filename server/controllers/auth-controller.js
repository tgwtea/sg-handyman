import bcrypt from 'bcryptjs';
import User from '../models/user-model.js';

const authController = {};

function toSessionUser(user) {
  return {
    _id: String(user._id),
    username: user.username,
    role: user.role,
    companyId: user.companyId ? String(user.companyId) : null
  };
}

// new session id on login, so an old cookie cannot take over the logged-in session
function startSession(req, res, user, status, failMessage) {
  req.session.regenerate((error) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ message: failMessage });
    }
    req.session.user = toSessionUser(user);
    res.status(status).send(req.session.user);
  });
}

authController.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send({ message: 'Username and password are required' });
    }

    const user = await User.findUserByUsername(username);
    const passwordMatches = user && await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }

    startSession(req, res, user, 200, 'Login failed');
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Login failed' });
  }
};

// Keep in sync with client/src/views/Signup.vue
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_TAKEN_MESSAGE = 'Username already taken';

// Signup creates customer accounts only. Business and admin accounts come from the seed.
authController.signup = async (req, res) => {
  try {
    // role and companyId in the body are ignored: the client cannot pick its own role
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const { password } = req.body;
    if (username.length < 3 || username.length > 30) {
      return res.status(400).send({ message: 'Username must be 3 to 30 characters' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).send({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    if (await User.findUserByUsername(username)) {
      return res.status(409).send({ message: USERNAME_TAKEN_MESSAGE });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.createUser({ username, password: hash });
    startSession(req, res, user, 201, 'Signup failed');
  } catch (error) {
    // 11000: the unique index caught a second signup with the same name at the same moment
    if (error.code === 11000) {
      return res.status(409).send({ message: USERNAME_TAKEN_MESSAGE });
    }
    console.error(error);
    res.status(500).send({ message: 'Signup failed' });
  }
};

authController.logout = (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      return res.status(500).send({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.send({ message: 'Logged out' });
  });
};

authController.me = (req, res) => {
  if (!req.session.user) {
    return res.status(401).send({ message: 'Not logged in' });
  }
  res.send(req.session.user);
};

export default authController;
