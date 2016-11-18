function sanitizeUser(user) {
  if (user.phone_number) {
    user.phoneNumber = user.phone_number;
  }
  delete user.password_hash;
  delete user.phone_number;
  return user;
}

module.exports = { sanitizeUser };
