const crypto = require('crypto');

const hashPassword = (password) => {
    // Simple PBKDF2 hashing
    const salt = process.env.PASSWORD_SALT || 'ravaapos_default_salt';
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

const comparePassword = (password, hashedPassword) => {
    return hashPassword(password) === hashedPassword;
};

module.exports = {
    hashPassword,
    comparePassword
};
