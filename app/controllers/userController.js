const { User } = require('../models');
const { hashPassword } = require('../helpers/auth');
const { getPaginationParams } = require('../helpers/pagination');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
    try {
        const totalItems = await User.count();
        const {
            page,
            limit,
            offset,
            totalPages
        } = getPaginationParams(req.query.page, req.query.limit, totalItems);

        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.render('users/index', {
            title: 'Manajemen User',
            users,
            activePage: 'users',
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
            },
        });
    } catch (error) {
        console.error('Error saat mengambil data user:', error);
        res.status(500).render('error', {
            message: 'Gagal memuat data user',
            error
        });
    }
};

exports.getPartial = async (req, res) => {
    const { page, limit: limitQuery, search } = req.query;
    
    try {
        const where = {};
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { username: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const totalItems = await User.count({ where });
        const {
            limit,
            offset,
            totalPages,
            page: currentPage
        } = getPaginationParams(page, limitQuery, totalItems);

        const users = await User.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.render('users/_partial', {
            users,
            pagination: {
                page: currentPage,
                limit,
                totalItems,
                totalPages,
            },
            layout: false
        });
    } catch (error) {
        console.error('Error saat mengambil partial data user:', error);
        res.status(500).send('Gagal memuat data');
    }
};

exports.create = async (req, res) => {
    const { username, password, name, email, role, is_active } = req.body;
    
    if (!username || !password || !name || !role) {
        return res.status(400).json({ success: false, message: 'Username, Password, Nama, dan Role harus diisi' });
    }

    try {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
        }

        await User.create({
            username,
            password: hashPassword(password),
            name,
            email: email || null,
            role,
            is_active: is_active === 'on' || is_active === true || is_active === 'true'
        });

        return res.status(201).json({ success: true, message: 'User berhasil ditambahkan' });
    } catch (error) {
        console.error('Error saat membuat user:', error);
        return res.status(500).json({ success: false, message: 'Gagal menambahkan user' });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { username, password, name, email, role, is_active } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        const updateData = { 
            username, 
            name, 
            email: email || null, 
            role,
            is_active: is_active === 'on' || is_active === true || is_active === 'true'
        };
        
        if (password && password.trim() !== '') {
            updateData.password = hashPassword(password);
        }

        await user.update(updateData);
        return res.json({ success: true, message: 'User berhasil diperbarui' });
    } catch (error) {
        console.error('Error saat memperbarui user:', error);
        return res.status(500).json({ success: false, message: 'Gagal memperbarui user' });
    }
};

exports.delete = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
        }

        await user.destroy();
        return res.json({ success: true, message: 'User berhasil dihapus' });
    } catch (error) {
        console.error('Error saat menghapus user:', error);
        return res.status(500).json({ success: false, message: 'Gagal menghapus user' });
    }
};
