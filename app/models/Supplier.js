module.exports = (sequelize, DataTypes) => {
    const Supplier = sequelize.define('Supplier', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phone: DataTypes.STRING,
        address: DataTypes.TEXT,
        email: DataTypes.STRING,
        note: DataTypes.TEXT
    });

    Supplier.associate = models => {
        Supplier.hasMany(models.Product, {
            foreignKey: 'supplierId',
            as: 'products'
        });
    };

    return Supplier;
};
