const ROLE_ALIASES = {
  junior: 'Junior',
  pleno: 'Pleno',
  senior: 'Senior',
};

const SUPPORTED_ROLES = ['Junior', 'Pleno', 'Senior'];

function normalizeRole(rawRole) {
  if (!rawRole || typeof rawRole !== 'string') {
    return null;
  }

  const normalizedKey = rawRole
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return ROLE_ALIASES[normalizedKey] || null;
}

function getSupportedRoles() {
  return [...SUPPORTED_ROLES];
}

function getNextRole(role) {
  const currentIndex = SUPPORTED_ROLES.indexOf(role);
  if (currentIndex === -1 || currentIndex === SUPPORTED_ROLES.length - 1) {
    return null;
  }

  return SUPPORTED_ROLES[currentIndex + 1];
}

function getPreviousRole(role) {
  const currentIndex = SUPPORTED_ROLES.indexOf(role);
  if (currentIndex <= 0) {
    return null;
  }

  return SUPPORTED_ROLES[currentIndex - 1];
}

module.exports = {
  ROLE_ALIASES,
  SUPPORTED_ROLES,
  getNextRole,
  getPreviousRole,
  getSupportedRoles,
  normalizeRole,
};
