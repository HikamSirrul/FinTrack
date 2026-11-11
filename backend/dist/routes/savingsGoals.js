import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.use(authenticate);
const savingsGoalSchema = z.object({
    name: z.string().trim().min(1).max(100),
    targetAmount: z.number().positive().finite(),
    currentAmount: z.number().min(0).finite().optional(),
    deadline: z.coerce.date().nullable().optional(),
});
const contributionSchema = z.object({
    amount: z.number().positive().finite(),
});
// GET /api/savings-goals
router.get('/', async (req, res) => {
    try {
        const goals = await prisma.savingsGoal.findMany({
            where: { userId: req.userId },
            include: {
                contributions: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({
            message: 'Sasaran tabungan berhasil diambil.',
            goals,
        });
    }
    catch (error) {
        console.error('Get savings goals error:', error);
        res.status(500).json({
            message: 'Gagal mengambil sasaran tabungan.',
        });
    }
});
// POST /api/savings-goals
router.post('/', async (req, res) => {
    const parsed = savingsGoalSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data sasaran tabungan tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    const { name, targetAmount, currentAmount, deadline } = parsed.data;
    const openingAmount = currentAmount ?? 0;
    if (openingAmount > targetAmount) {
        res.status(400).json({
            message: 'Jumlah tabungan terkumpul tidak boleh melebihi target.',
        });
        return;
    }
    try {
        const goal = await prisma.savingsGoal.create({
            data: {
                name,
                targetAmount,
                currentAmount: openingAmount,
                deadline: deadline ?? null,
                userId: req.userId,
                ...(openingAmount > 0
                    ? { contributions: { create: { amount: openingAmount } } }
                    : {}),
            },
            include: {
                contributions: { orderBy: { createdAt: 'asc' } },
            },
        });
        res.status(201).json({
            message: 'Sasaran tabungan berhasil dibuat.',
            goal,
        });
    }
    catch (error) {
        console.error('Create savings goal error:', error);
        res.status(500).json({
            message: 'Gagal membuat sasaran tabungan.',
        });
    }
});
// POST /api/savings-goals/:id/contributions
router.post('/:id/contributions', async (req, res) => {
    const parsed = contributionSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Nominal setoran tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.savingsGoal.findFirst({
                where: { id: req.params.id, userId: req.userId },
            });
            if (!existing) {
                return { notFound: true };
            }
            const nextAmount = Number(existing.currentAmount) + parsed.data.amount;
            if (nextAmount > Number(existing.targetAmount)) {
                return { exceedsTarget: true };
            }
            const contribution = await tx.savingsContribution.create({
                data: {
                    goalId: existing.id,
                    amount: parsed.data.amount,
                },
            });
            const goal = await tx.savingsGoal.update({
                where: { id: existing.id },
                data: { currentAmount: { increment: parsed.data.amount } },
            });
            return { contribution, goal };
        });
        if ('notFound' in result) {
            res.status(404).json({ message: 'Sasaran tabungan tidak ditemukan.' });
            return;
        }
        if ('exceedsTarget' in result) {
            res.status(400).json({ message: 'Nominal setoran melebihi sisa target tabungan.' });
            return;
        }
        res.status(201).json({
            message: 'Setoran berhasil dicatat.',
            ...result,
        });
    }
    catch (error) {
        console.error('Create savings contribution error:', error);
        res.status(500).json({
            message: 'Gagal mencatat setoran tabungan.',
        });
    }
});
// GET /api/savings-goals/:id
router.get('/:id', async (req, res) => {
    try {
        const goal = await prisma.savingsGoal.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
            include: {
                contributions: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!goal) {
            res.status(404).json({
                message: 'Sasaran tabungan tidak ditemukan.',
            });
            return;
        }
        res.status(200).json({
            message: 'Detail sasaran tabungan berhasil diambil.',
            goal,
        });
    }
    catch (error) {
        console.error('Get savings goal error:', error);
        res.status(500).json({
            message: 'Gagal mengambil detail sasaran tabungan.',
        });
    }
});
// PATCH /api/savings-goals/:id
router.patch('/:id', async (req, res) => {
    const parsed = savingsGoalSchema
        .partial()
        .refine((data) => Object.keys(data).length > 0, { message: 'Minimal satu field harus diubah.' })
        .safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data perubahan sasaran tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    try {
        const existing = await prisma.savingsGoal.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Sasaran tabungan tidak ditemukan.',
            });
            return;
        }
        const nextTarget = parsed.data.targetAmount ?? Number(existing.targetAmount);
        const nextCurrent = parsed.data.currentAmount ?? Number(existing.currentAmount);
        if (nextCurrent > nextTarget) {
            res.status(400).json({
                message: 'Jumlah tabungan terkumpul tidak boleh melebihi target.',
            });
            return;
        }
        const goal = await prisma.savingsGoal.update({
            where: { id: existing.id },
            data: parsed.data,
        });
        res.status(200).json({
            message: 'Sasaran tabungan berhasil diperbarui.',
            goal,
        });
    }
    catch (error) {
        console.error('Update savings goal error:', error);
        res.status(500).json({
            message: 'Gagal memperbarui sasaran tabungan.',
        });
    }
});
// DELETE /api/savings-goals/:id
router.delete('/:id', async (req, res) => {
    try {
        const existing = await prisma.savingsGoal.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Sasaran tabungan tidak ditemukan.',
            });
            return;
        }
        await prisma.savingsGoal.delete({
            where: { id: existing.id },
        });
        res.status(200).json({
            message: 'Sasaran tabungan berhasil dihapus.',
        });
    }
    catch (error) {
        console.error('Delete savings goal error:', error);
        res.status(500).json({
            message: 'Gagal menghapus sasaran tabungan.',
        });
    }
});
export default router;
