const {
    Sale,
    SaleItem,
    Product,
    Category,
    Customer,
    User,
    Supplier,
    SalePayment,
    StockMovement,
    CashierSession
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');

class ReportService {
    async getDashboardStats(startDate, endDate) {
        const currentWhere = {
            status: 'completed',
            createdAt: { [Op.between]: [startDate, endDate] }
        };

        // Get comparison date (previous period of same duration)
        const duration = endDate - startDate;
        const prevStartDate = new Date(startDate.getTime() - duration);
        const prevEndDate = new Date(endDate.getTime() - duration);
        const prevWhere = {
            status: 'completed',
            createdAt: { [Op.between]: [prevStartDate, prevEndDate] }
        };

        const [currentSales, prevSales, lowStockCount] = await Promise.all([
            Sale.findAll({ attributes: ['total', 'subtotal', 'tax', 'discount'], where: currentWhere }),
            Sale.findAll({ attributes: ['total'], where: prevWhere }),
            Product.count({ where: { stock: { [Op.lte]: col('reorderPoint') } } })
        ]);

        const stats = {
            sales: currentSales.reduce((sum, s) => sum + parseFloat(s.total), 0),
            transactions: currentSales.length,
            itemsSold: 0, // Will calculate from items if needed, or estimate
            avgTransaction: currentSales.length ? currentSales.reduce((sum, s) => sum + parseFloat(s.total), 0) / currentSales.length : 0,
            lowStock: lowStockCount,
            refundTotal: 0, // If you have return/refund model
        };

        // Calculate comparison
        const prevTotal = prevSales.reduce((sum, s) => sum + parseFloat(s.total), 0);
        stats.salesComparison = prevTotal ? ((stats.sales - prevTotal) / prevTotal) * 100 : 100;

        return stats;
    }

    async getSalesReport(filters) {
        const { dateFrom, dateTo, cashierId, customerId, paymentMethod, status, limit, offset } = filters;
        
        const where = {};
        if (dateFrom && dateTo) {
            where.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }
        if (cashierId) where.cashierId = cashierId;
        if (customerId) where.customerId = customerId;
        if (paymentMethod) where.paymentMethod = paymentMethod;
        if (status) where.status = status;

        const { count, rows } = await Sale.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: User, as: 'cashier', attributes: ['name'] },
                { model: SalePayment, as: 'payments' }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit ? parseInt(limit) : 10,
            offset: offset ? parseInt(offset) : 0
        });

        return { total: count, sales: rows };
    }

    async getBestSellers(filters) {
        const { dateFrom, dateTo, categoryId, limit = 10 } = filters;
        
        const saleWhere = { status: 'completed' };
        if (dateFrom && dateTo) {
            saleWhere.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }

        const items = await SaleItem.findAll({
            attributes: [
                'productId',
                [fn('SUM', col('qty')), 'totalQty'],
                [fn('SUM', col('SaleItem.subtotal')), 'totalRevenue']
            ],
            include: [
                { 
                    model: Sale, 
                    as: 'sale', 
                    where: saleWhere,
                    attributes: [] 
                },
                { 
                    model: Product, 
                    as: 'product', 
                    attributes: ['name', 'stock', 'salePrice', 'cost'],
                    include: [{ model: Category, as: 'category', attributes: ['name'] }],
                    where: categoryId ? { categoryId } : {}
                }
            ],
            group: ['productId', 'product.id', 'product.name', 'product.stock', 'product.salePrice', 'product.cost', 'product->category.id', 'product->category.name'],
            order: [[literal('totalQty'), 'DESC']],
            limit: parseInt(limit)
        });

        return items.map(item => {
            const data = item.toJSON();
            const cost = data.product.cost || 0;
            const revenue = parseFloat(data.totalRevenue);
            const qty = parseInt(data.totalQty);
            // Estimation of profit based on current cost
            data.estimatedProfit = revenue - (cost * qty);
            return data;
        });
    }

    async getPaymentReport(dateFrom, dateTo) {
        const where = {};
        if (dateFrom && dateTo) {
            where.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }

        const payments = await SalePayment.findAll({
            attributes: [
                [col('SalePayment.paymentMethod'), 'paymentMethod'],
                [fn('SUM', col('SalePayment.amount')), 'totalAmount'],
                [fn('COUNT', col('SalePayment.id')), 'count']
            ], 
            include: [{
                model: Sale,
                as: 'sale',
                where: { ...where, status: 'completed' },
                attributes: []
            }],
            group: [col('SalePayment.paymentMethod')]
        });

        return payments;
    }

    async getStockMovement(filters) {
        const { dateFrom, dateTo, productId, type, limit = 20, offset = 0 } = filters;
        const where = {};
        if (dateFrom && dateTo) {
            where.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }
        if (productId) where.productId = productId;
        if (type) where.type = type;

        const { count, rows } = await StockMovement.findAndCountAll({
            where,
            include: [{ model: Product, as: 'product', attributes: ['name', 'code'] }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return { total: count, movements: rows };
    }

    async getCashierReport(dateFrom, dateTo) {
        const where = { status: 'completed' };
        if (dateFrom && dateTo) {
            where.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }

        const reports = await Sale.findAll({
            attributes: [
                'cashierId',
                [fn('COUNT', col('Sale.id')), 'transactionCount'],
                [fn('SUM', col('total')), 'totalSales'],
                [fn('AVG', col('total')), 'avgTransaction'],
                [fn('SUM', col('discount')), 'totalDiscount']
            ],
            include: [{ model: User, as: 'cashier', attributes: ['name'] }],
            where,
            group: ['cashierId', 'cashier.id', 'cashier.name']
        });

        return reports;
    }

    async getProfitLoss(dateFrom, dateTo) {
        const where = { status: 'completed' };
        if (dateFrom && dateTo) {
            where.createdAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo + ' 23:59:59')] };
        }

        const salesData = await Sale.findAll({
            where,
            include: [{ 
                model: SaleItem, 
                as: 'items', 
                include: [{ model: Product, as: 'product', attributes: ['cost'] }] 
            }]
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        salesData.forEach(sale => {
            totalRevenue += parseFloat(sale.subtotal);
            totalDiscount += parseFloat(sale.discount || 0);
            totalTax += parseFloat(sale.tax || 0);
            
            sale.items.forEach(item => {
                const cost = (item.product && item.product.cost) ? item.product.cost : 0;
                totalCost += cost * item.qty;
            });
        });

        const grossProfit = totalRevenue - totalCost;
        const netProfit = grossProfit - totalDiscount; // Simple calc: revenue - cogs - discount

        return {
            totalRevenue,
            totalCost,
            totalDiscount,
            totalTax,
            grossProfit,
            netProfit
        };
    }

    async getLowStock() {
        return await Product.findAll({
            where: {
                type: 'fisik',
                reorderPoint: {
                    [Op.gt]: 0
                },
                stock: {
                    [Op.lte]: col('reorderPoint')
                }
            },
            include: [{
                    model: Category,
                    as: 'category',
                    attributes: ['name']
                },
                {
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['name']
                }
            ],
            order: [
                ['stock', 'ASC']
            ]
        });
    }
}

module.exports = new ReportService();
