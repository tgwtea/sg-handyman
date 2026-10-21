export function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).send({ message: 'Please log in first' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).send({ message: 'Please log in first' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).send({ message: 'You do not have permission to do this' });
    }
    next();
  };
}

// admin manages every company; a business user manages only their own company
export function canManageCompany(user, companyId) {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  return user.role === 'business' && !!user.companyId && String(user.companyId) === String(companyId);
}
