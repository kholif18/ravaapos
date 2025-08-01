module.exports = (sequelize, DataTypes) => {
    const Customer = sequelize.define('Customer', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('umum', 'member'),
            allowNull: false,
            defaultValue: 'umum'
        },
        memberSince: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            },
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        birthdate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        memberCode: {
            type: DataTypes.STRING,
            allowNull: true
        },
        memberDiscount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        point: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active'
        }
    });

    return Customer;
};
