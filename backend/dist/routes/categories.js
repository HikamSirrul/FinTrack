import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
const categorySchema = z.object({
    name: z.string().trim().min(1).max(100),
    type: z.enum(['INCOME', 'EXPENSE']),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { userId: req.userId },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
        res.status(200).json({
            message: 'Kategori berhasil diambil.',
            categories,
        });
    }
    catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ message: 'Gagal mengambil kategori.' });
    }
});
// POST /api/categories
router.post('/', async (req, res) => {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data kategori tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const category = await prisma.category.create({
            data: {
                name: parsed.data.name,
                type: parsed.data.type,
                color: parsed.data.color ?? '#64748b',
                userId: req.userId,
            },
        });
        res.status(201).json({
            message: 'Kategori berhasil dibuat.',
            category,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            'code' in error &&
            error.code === 'P2002') {
            res.status(409).json({
                message: 'Kategori dengan nama dan tipe tersebut sudah ada.',
            });
            return;
        }
        console.error('Create category error:', error);
        res.status(500).json({ message: 'Gagal membuat kategori.' });
    }
});
// PATCH /api/categories/:id
router.patch('/:id', async (req, res) => {
    const parsed = categorySchema.partial().refine((data) => Object.keys(data).length > 0, { message: 'Minimal satu field harus diubah.' }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data perubahan tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const existing = await prisma.category.findFirst({
            where: { id: req.params.id, userId: req.userId },
        });
        if (!existing) {
            res.status(404).json({ message: 'Kategori tidak ditemukan.' });
            return;
        }
        const nextType = parsed.data.type ?? existing.type;
        if (nextType !== existing.type) {
            const used = await prisma.transaction.count({
                where: {
                    userId: req.userId,
                    categoryId: existing.id,
                },
            });
            if (used > 0) {
                res.status(409).json({
                    message: 'Tipe kategori tidak dapat diubah karena sudah digunakan transaksi.',
                });
                return;
            }
        }
        const category = await prisma.category.update({
            where: { id: existing.id },
            data: parsed.data,
        });
        res.status(200).json({
            message: 'Kategori berhasil diperbarui.',
            category,
        });
    }
    catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ message: 'Gagal memperbarui kategori.' });
    }
});
// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
    try {
        const existing = await prisma.category.findFirst({
            where: { id: req.params.id, userId: req.userId },
        });
        if (!existing) {
            res.status(404).json({ message: 'Kategori tidak ditemukan.' });
            return;
        }
        const used = await prisma.transaction.count({
            where: {
                userId: req.userId,
                categoryId: existing.id,
            },
        });
        if (used > 0) {
            res.status(409).json({
                message: 'Kategori masih digunakan transaksi dan tidak dapat dihapus.',
            });
            return;
        }
        await prisma.category.delete({ where: { id: existing.id } });
        res.status(200).json({ message: 'Kategori berhasil dihapus.' });
    }
    catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ message: 'Gagal menghapus kategori.' });
    }
});
export default router;
