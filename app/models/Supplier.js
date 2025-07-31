module.exports = (sequelize, DataTypes) => {
    const Supplier = sequelize.define('Supplier', {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        contact: DataTypes.STRING,
        address: DataTypes.TEXT,
        email: DataTypes.STRING,
        notes: DataTypes.TEXT
    });

    Supplier.associate = models => {
        // contoh jika ada relasi ke PurchaseOrder nanti
        // Supplier.hasMany(models.PurchaseOrder, { foreignKey: 'supplierId' });
    };

    return Supplier;
};
