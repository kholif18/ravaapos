module.exports = (sequelize, DataTypes) => {
    const AuditLog = sequelize.define('AuditLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entity: {
            type: DataTypes.STRING,
            allowNull: true
        },
        entityId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        oldValue: {
            type: DataTypes.JSON,
            allowNull: true
        },
        newValue: {
            type: DataTypes.JSON,
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.STRING,
            allowNull: true
        },
        userAgent: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        tableName: 'AuditLogs',
        timestamps: true
    });

    AuditLog.associate = models => {
        AuditLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return AuditLog;
};
