const { name } = require('ejs');
const {
    Supplier,
    sequelize
} = require('../models');
const {
    validationResult
} = require('express-validator');
const {Op} = require('sequelize');
const {
    getPaginationParams
} = require('../helpers/pagination');

exports.getAll = async (req, res) => {
    const search = req.query.search || '';
    const where = search ? {
        name: {
            [Op.like]: `%${search}%`
        }
    } : {};

    try {
        const totalItems = await Supplier.count({
            where
        });

        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        const rows = await Supplier.findAll({
            where,
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset,
        });

        res.render('suppliers/index', {
            title: 'Suppliers',
            activePage: 'suppliers',
            suppliers: rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                search
            }
        });
    } catch (err) {
        console.error('Gagal memuat data supplier:', err);
        res.status(500).render('error', {
            title: 'Error',
            activePage: 'suppliers',
            message: 'Gagal memuat supplier',
            error: err
        });
    }
};

exports.getAllJSON = async (req, res) => {
    const search = req.query.search || '';
    const where = search ? {
        name: {
            [Op.like]: `%${search}%`
        }
    } : {};

    try {
        const totalItems = await Supplier.count({
            where
        });
        
        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        const rows = await Supplier.findAll({
            where,
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset
        });

        res.json({
            data: rows,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal memuat data supplier'
        });
    }
};

exports.generateSupplierCode = async (req, res) => {
    try {
        const last = await Supplier.findOne({
            where: {
                code: {
                    [Op.like]: 'SUP%'
                }
            },
            order: [
                ['createdAt', 'DESC']
            ],
        });

        let nextNumber = 1;
        if (last?.code?.startsWith('SUP')) {
            const num = parseInt(last.code.slice(3));
            if (!isNaN(num)) nextNumber = num + 1;
        }

        let newCode;
        let exists = true;
        do {
            newCode = `SUP${String(nextNumber).padStart(4, '0')}`;
            const dup = await Supplier.findOne({
                where: {
                    code: newCode
                }
            });
            exists = !!dup;
            nextNumber++;
        } while (exists);

        res.json({
            code: newCode
        });
    } catch {
        res.status(500).json({
            error: 'Gagal generate kode'
        });
    }
};

exports.checkCode = async (req, res) => {
    try {
        const code = req.query.code?.trim();
        if (!code) return res.json({
            exists: false
        });

        const exists = await Supplier.findOne({
            where: {
                code
            }
        });
        res.json({
            exists: !!exists
        });
    } catch {
        res.status(500).json({
            error: 'Gagal memeriksa kode'
        });
    }
};

exports.create = async (req, res) => {
    const {
        code,
        name,
        phone,
        email,
        address,
        city,
        postalCode,
        country,
        note
    } = req.body;
    try {
        await Supplier.create({
            code,
            name,
            phone,
            email,
            address,
            city,
            postalCode,
            country,
            note
        });
        res.json({
            success: true,
            message: 'Supplier berhasil ditambahkan'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menambah supplier'
        });
    }
};

exports.update = async (req, res) => {
    const id = req.params.id;
    const {
        code,
        name,
        phone,
        email,
        address,
        city,
        postalCode,
        country,
        note
    } = req.body;

    try {
        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({
            success: false,
            message: 'Supplier tidak ditemukan'
        });

        await supplier.update({
            code,
            name,
            phone,
            email,
            address,
            city,
            postalCode,
            country,
            note
        });
        res.json({
            success: true,
            message: 'Supplier berhasil diperbarui'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui supplier'
        });
    }
};

exports.getByIdJSON = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: supplier
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('error', {
            title: 'Error',
            activePage: '', // atau 'suppliers' atau nilai lain yang aman
            message: 'Gagal memuat supplier',
            error: err
        });

    }
};

exports.delete = async (req, res) => {
    const id = req.params.id;

    try {
        const supplier = await Supplier.findByPk(id);
        if (!supplier) return res.status(404).json({
            success: false,
            message: 'Supplier tidak ditemukan'
        });

        await supplier.destroy();
        res.json({
            success: true,
            message: 'Supplier berhasil dihapus'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus supplier'
        });
    }
};

exports.getPartial = async (req, res) => {
    const search = req.query.search?.trim() || '';
    const where = search ? {
        name: {
            [Op.like]: `%${search}%`
        }
    } : {};

    try {
        const totalItems = await Supplier.count({
            where
        });
        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        const rows = await Supplier.findAll({
            where,
            order: [
                ['name', 'ASC']
            ],
            limit,
            offset
        });

        res.render('suppliers/_partial', {
            layout: false,
            suppliers: rows,
            pagination: {
                page,
                limit,
                totalPages,
                totalItems,
                search
            }
        });
    } catch (err) {
        console.error('Gagal memuat partial supplier:', err);
        res.status(500).send('Gagal memuat data');
    }
};

exports.getDetail = async (req, res) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) {
            return res.status(404).render('error', {
                message: 'Supplier tidak ditemukan',
                error: {}
            });
        }

        res.render('suppliers/detail', {
            title: `Detail Supplier - ${supplier.name}`,
            supplier,
            activePage: 'suppliers'
        });
    } catch (err) {
        console.error('Gagal mengambil detail supplier:', err);
        res.status(500).render('error', {
            message: 'Terjadi kesalahan',
            error: err
        });
    }
};
