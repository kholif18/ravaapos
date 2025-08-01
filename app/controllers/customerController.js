const {
    Customer
} = require('../models');
const {
    validationResult
} = require('express-validator');

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

exports.getAll = async (req, res) => {
    try {
        const customers = await Customer.findAll({
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.render('customers/index', {
            customers,
            activePage: 'customers',
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
            message: 'Customer tidak ditemukan'
        });

        await customer.destroy();
        res.json({
            message: 'Customer berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Gagal menghapus customer'
        });
    }
};
