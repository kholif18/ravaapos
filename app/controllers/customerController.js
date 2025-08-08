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
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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
function buildSearchFilter({
    search,
    type,
    status
}) {
    const where = {};

    if (search) {
        where[Op.or] = [{
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
            },
        ];
    }

    if (type) {
        where.type = type;
    }

    if (status) {
        where.status = status;
    }

    return where;
}

exports.getAll = async (req, res) => {
    try {
        const where = buildSearchFilter(req.query);

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
        const sort = req.query.sort || 'name';
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

        const rows = await Customer.findAll({
            where,
            limit,
            offset,
            order: [
                [sort, order]
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
        const where = buildSearchFilter(req.query);

        const sort = req.query.sort || 'createdAt';
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

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
        const where = buildSearchFilter(req.query);
        const sort = req.query.sort || 'createdAt';
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

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

        res.render('customers/_partial', {
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

exports.downloadTemplate = (req, res) => {
    const headers = 'name,type,email,phone,birthdate,address,note,memberDiscount,point,status\n';
    const example = 'Jane Doe,member,jane@example.com,08123456789,1990-01-01,Jl. Mawar 123,Catatan,5,100,active\n';
    res.header('Content-Type', 'text/csv');
    res.attachment('template_customer.csv');
    res.send(headers + example);
};

exports.exportCSV = async (req, res) => {
    try {
        const where = buildSearchFilter(req.query);
        const sort = req.query.sort || 'createdAt';
        const order = req.query.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const customers = await Customer.findAll({
            where,
            order: [
                [sort, order]
            ],
        });

        let csv = 'name,type,email,phone,birthdate,address,note,memberDiscount,point,status\n';
        for (const c of customers) {
            const line = [
                c.name,
                c.type,
                c.email || '',
                c.phone || '',
                c.birthdate || '',
                c.address?.replace(/\n/g, ' ') || '',
                c.note?.replace(/\n/g, ' ') || '',
                c.memberDiscount || 0,
                c.point || 0,
                c.status
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
            csv += line + '\n';
        }

        res.header('Content-Type', 'text/csv');
        res.attachment('customers_export.csv');
        res.send(csv);
    } catch (err) {
        console.error('Gagal ekspor customer CSV:', err);
        res.status(500).send('Gagal mengekspor CSV');
    }
};

exports.importCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada file yang diunggah'
        });
    }

    const filePath = path.join(__dirname, '../../', req.file.path);
    const customers = [];

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    customers.push({
                        name: row.name,
                        type: row.type,
                        email: row.email || null,
                        phone: row.phone || null,
                        birthdate: row.birthdate || null,
                        address: row.address || null,
                        note: row.note || null,
                        memberDiscount: parseInt(row.memberDiscount) || 0,
                        point: parseInt(row.point) || 0,
                        status: row.status || 'active'
                    });
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Simpan ke database
        for (const c of customers) {
            await Customer.create(c);
        }

        fs.unlinkSync(filePath); // hapus file temp
        res.json({
            success: true,
            message: 'Import selesai. ' + customers.length + ' data dimasukkan.'
        });
    } catch (err) {
        console.error('Gagal import CSV:', err);
        res.status(500).json({
            success: false,
            message: 'Gagal mengimpor data.'
        });
    }
};