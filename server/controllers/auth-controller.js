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

    // new session id on login, so an old cookie cannot take over the logged-in session
    req.session.regenerate((error) => {
      if (error) {
        console.error(error);
        return res.status(500).send({ message: 'Login failed' });
      }
      req.session.user = toSessionUser(user);
      res.send(req.session.user);
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Login failed' });
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
