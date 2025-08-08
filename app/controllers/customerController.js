const {
    Customer
} = require('../models');
const {
    validationResult
} = require('express-validator');
const {
    Op
} = require('sequelize');
const {
    getPaginationParams
} = require('../helpers/pagination');

// Helper untuk kode member otomatis (misal: MBR-20250801-001)
async function generateMemberCode() {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Customer.count({
        where: {
            type: 'member'
        }
    });
    const next = String(count + 1).padStart(3, '0');
    return `MBR-${yyyymmdd}-${next}`;
}

// Helper untuk filter pencarian
function buildSearchFilter(search) {
    if (!search) return {};
    return {
        [Op.or]: [{
                name: {
                    [Op.like]: `%${search}%`
                }
            },
            {
                email: {
                    [Op.like]: `%${search}%`
                }
            },
            {
                phone: {
                    [Op.like]: `%${search}%`
                }
            }
        ]
    };
}

exports.getAll = async (req, res) => {
    try {
        const where = buildSearchFilter(req.query.search);

        const totalItems = await Customer.count({
            where
        });

        const {
            page,
            limit,
            offset,
            totalPages
        } =
        getPaginationParams(req.query.page, req.query.limit, totalItems);

        const rows = await Customer.findAll({
            where,
            limit,
            offset,
            order: [
                ['createdAt', 'DESC']
            ]
        });

        res.render('customers/index', {
            title: 'Customers',
            activePage: 'customers',
            customers: rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages
            },
            query: req.query
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal memuat data pelanggan');
    }
};

exports.create = async (req, res) => {
    try {
        const {
            name,
            type,
            email,
            phone,
            birthdate,
            address,
            note,
            memberDiscount,
            point,
            status
        } = req.body;

        let memberCode = null;
        let memberSince = null;

        if (type === 'member') {
            memberCode = await generateMemberCode();
            memberSince = new Date();
        }

        const customer = await Customer.create({
            name,
            type,
            email: email || null,
            phone: phone || null,
            birthdate,
            address,
            note,
            memberCode,
            memberDiscount: type === 'member' ? memberDiscount || 0 : 0,
            point: type === 'member' ? point || 0 : 0,
            status,
            memberSince
        });

        return res.json({
            success: true,
            message: 'Customer berhasil ditambahkan'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Gagal menyimpan customer'
        });
    }
};

// update
exports.update = async (req, res) => {
    try {
        const id = req.params.id;
        const {
            name,
            type,
            email,
            phone,
            birthdate,
            address,
            note,
            memberDiscount,
            point,
            status
        } = req.body;

        const customer = await Customer.findByPk(id);
        if (!customer) return res.status(404).json({
            success: false,
            message: 'Customer tidak ditemukan'
        });

        if (type === 'member' && !customer.memberCode) {
            customer.memberCode = await generateMemberCode();
        }

        await customer.update({
            name,
            type,
            email: email || null,
            phone: phone || null,
            birthdate,
            address,
            note,
            memberDiscount: type === 'member' ? memberDiscount || 0 : 0,
            point: type === 'member' ? point || 0 : 0,
            status
        });

        if (type === 'member' && !customer.memberSince) {
            customer.memberSince = new Date();
            await customer.save();
        }

        // ===> kirim JSON response ke AJAX
        return res.json({
            success: true,
            message: 'Customer berhasil diperbarui'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Gagal memperbarui data customer'
        });
    }
};

exports.destroy = async (req, res) => {
    try {
        const id = req.params.id;
        const customer = await Customer.findByPk(id);
        if (!customer) return res.status(404).json({
            success: false,
            message: 'Customer tidak ditemukan'
        });

        await customer.destroy();

        return res.json({
            success: true,
            message: 'Customer berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            message: 'Gagal menghapus customer'
        });
    }
};

exports.getListAJAX = async (req, res) => {
    try {
        const {
            page,
            limit,
            offset
        } = getPaginationParams(req.query.page, req.query.limit);
        const where = buildSearchFilter(req.query.search);

        if (req.query.type) where.type = req.query.type;
        if (req.query.status) where.status = req.query.status;

        const sort = req.query.sort || 'createdAt';
        const order = req.query.order === 'ASC' ? 'ASC' : 'DESC';

        const {
            count,
            rows
        } = await Customer.findAndCountAll({
            where,
            limit,
            offset,
            order: [
                [sort, order]
            ]
        });

        res.json({
            data: rows,
            pagination: {
                page,
                totalPages: Math.ceil(count / limit),
                limit,
                totalItems: count
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Gagal mengambil data customer'
        });
    }
};

// === GET PARTIAL (untuk reload table via AJAX) ===
exports.getPartial = async (req, res) => {
    try {
        const {
            page,
            limit,
            offset
        } = getPaginationParams(req.query.page, req.query.limit);
        const where = buildSearchFilter(req.query.search);

        const {
            count,
            rows
        } = await Customer.findAndCountAll({
            where,
            limit,
            offset,
            order: [
                ['createdAt', 'DESC']
            ]
        });

        res.render('customers/partials/_table', {
            customers: rows,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(count / limit),
                totalItems: count
            },
            query: req.query,
            layout: false
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Gagal memuat data customer');
    }
};