import { Router } from 'express';
import { z } from 'zod';
import { CategoryType } from '@prisma/client';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
const budgetSchema = z.object({
    amount: z.number().positive().finite(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
    categoryId: z.string().min(1),
});
// Memastikan kategori merupakan kategori pengeluaran milik pengguna
async function validateCategory(categoryId, userId) {
    return prisma.category.findFirst({
        where: {
            id: categoryId,
            userId,
            type: CategoryType.EXPENSE,
        },
    });
}
// GET /api/budgets
router.get('/', async (req, res) => {
    try {
        const month = req.query.month
            ? Number(req.query.month)
            : undefined;
        const year = req.query.year
            ? Number(req.query.year)
            : undefined;
        if ((month !== undefined &&
            (!Number.isInteger(month) || month < 1 || month > 12)) ||
            (year !== undefined &&
                (!Number.isInteger(year) || year < 2000 || year > 2100))) {
            res.status(400).json({
                message: 'Parameter bulan atau tahun tidak valid.',
            });
            return;
        }
        const budgets = await prisma.budget.findMany({
            where: {
                userId: req.userId,
                ...(month !== undefined ? { month } : {}),
                ...(year !== undefined ? { year } : {}),
            },
            include: {
                category: true,
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });
        res.status(200).json({
            message: 'Anggaran berhasil diambil.',
            budgets,
        });
    }
    catch (error) {
        console.error('Get budgets error:', error);
        res.status(500).json({
            message: 'Gagal mengambil anggaran.',
        });
    }
});
// POST /api/budgets
router.post('/', async (req, res) => {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data anggaran tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const category = await validateCategory(parsed.data.categoryId, req.userId);
        if (!category) {
            res.status(400).json({
                message: 'Kategori pengeluaran tidak ditemukan.',
            });
            return;
        }
        const budget = await prisma.budget.create({
            data: {
                ...parsed.data,
                userId: req.userId,
            },
            include: {
                category: true,
            },
        });
        res.status(201).json({
            message: 'Anggaran berhasil dibuat.',
            budget,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            'code' in error &&
            error.code === 'P2002') {
            res.status(409).json({
                message: 'Anggaran untuk kategori dan periode tersebut sudah ada.',
            });
            return;
        }
        console.error('Create budget error:', error);
        res.status(500).json({
            message: 'Gagal membuat anggaran.',
        });
    }
});
// GET /api/budgets/:id
router.get('/:id', async (req, res) => {
    try {
        const budget = await prisma.budget.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
            include: {
                category: true,
            },
        });
        if (!budget) {
            res.status(404).json({
                message: 'Anggaran tidak ditemukan.',
            });
            return;
        }
        res.status(200).json({
            message: 'Detail anggaran berhasil diambil.',
            budget,
        });
    }
    catch (error) {
        console.error('Get budget detail error:', error);
        res.status(500).json({
            message: 'Gagal mengambil detail anggaran.',
        });
    }
});
// PATCH /api/budgets/:id
router.patch('/:id', async (req, res) => {
    const parsed = budgetSchema
        .partial()
        .refine((data) => Object.keys(data).length > 0, { message: 'Minimal satu field harus diubah.' })
        .safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data perubahan anggaran tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const existing = await prisma.budget.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Anggaran tidak ditemukan.',
            });
            return;
        }
        if (parsed.data.categoryId) {
            const category = await validateCategory(parsed.data.categoryId, req.userId);
            if (!category) {
                res.status(400).json({
                    message: 'Kategori pengeluaran tidak ditemukan.',
                });
                return;
            }
        }
        const budget = await prisma.budget.update({
            where: { id: existing.id },
            data: parsed.data,
            include: {
                category: true,
            },
        });
        res.status(200).json({
            message: 'Anggaran berhasil diperbarui.',
            budget,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            'code' in error &&
            error.code === 'P2002') {
            res.status(409).json({
                message: 'Anggaran untuk kategori dan periode tersebut sudah ada.',
            });
            return;
        }
        console.error('Update budget error:', error);
        res.status(500).json({
            message: 'Gagal memperbarui anggaran.',
        });
    }
});
// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
    try {
        const existing = await prisma.budget.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Anggaran tidak ditemukan.',
            });
            return;
        }
        await prisma.budget.delete({
            where: { id: existing.id },
        });
        res.status(200).json({
            message: 'Anggaran berhasil dihapus.',
        });
    }
    catch (error) {
        console.error('Delete budget error:', error);
        res.status(500).json({
            message: 'Gagal menghapus anggaran.',
        });
    }
});
export default router;
