const { AuditLog } = require('../models');

/**
 * Record an audit log entry
 * @param {Object} req - Express request object
 * @param {Object} options - Log details
 * @param {string} options.action - Action performed (e.g., 'login', 'create_sale')
 * @param {string} [options.entity] - Affected entity (e.g., 'Sale', 'Product')
 * @param {number} [options.entityId] - ID of the affected entity
 * @param {Object} [options.oldValue] - Previous values
 * @param {Object} [options.newValue] - New values
 */
const recordAudit = async (req, options) => {
    try {
        await AuditLog.create({
            userId: req.user ? req.user.id : null,
            action: options.action,
            entity: options.entity,
            entityId: options.entityId,
            oldValue: options.oldValue,
            newValue: options.newValue,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }, { transaction: options.transaction });
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};

module.exports = { recordAudit };
