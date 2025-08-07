module.exports = (sequelize, DataTypes) => {
    const Supplier = sequelize.define('Supplier', {
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: {
                    msg: 'Format email tidak valid'
                },
                notEmpty: false
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        city: {
            type: DataTypes.STRING,
            allowNull: true
        },
        postalCode: {
            type: DataTypes.STRING,
            allowNull: true
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'Suppliers',
        timestamps: true
    });

    Supplier.associate = models => {
        Supplier.hasMany(models.Product, {
            foreignKey: 'supplierId',
            as: 'products'
        });
    };

    return Supplier;
};
