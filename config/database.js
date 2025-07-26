const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './ravaapos.sqlite',
  logging: false,
});

module.exports = sequelize;
