const dialect = process.env.DB_DIALECT || 'sqlite';

const commonConfig = {
  dialect,
  logging: false
};

if (dialect === 'sqlite') {
  commonConfig.storage =
    process.env.DB_STORAGE || './database.sqlite';
} else {
  commonConfig.host = process.env.DB_HOST;
  commonConfig.port = process.env.DB_PORT;
  commonConfig.username = process.env.DB_USER;
  commonConfig.password = process.env.DB_PASSWORD;
  commonConfig.database = process.env.DB_NAME;
}

module.exports = {
  development: commonConfig,

  test: {
    ...commonConfig,
    storage: ':memory:'
  },

  production: commonConfig
};