import { Router } from 'express';
import { z } from 'zod';
import { Prisma, CategoryType } from '@prisma/client';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
// Semua endpoint transaksi wajib menggunakan JWT.
router.use(authenticate);
const transactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    amount: z.number().finite().positive().max(9999999999999.99),
    description: z.string().trim().max(500).nullable().optional(),
    date: z.string().datetime({ offset: true }).optional(),
    accountId: z.string().min(1).nullable().optional(),
    categoryId: z.string().min(1).nullable().optional(),
    transferFromId: z.string().min(1).nullable().optional(),
    transferToId: z.string().min(1).nullable().optional(),
});
const updateTransactionSchema = transactionSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
    message: 'Minimal satu field harus diubah.',
});
async function validateReferences(userId, data) {
    if (data.accountId) {
        const account = await prisma.account.findFirst({
            where: {
                id: data.accountId,
                userId,
            },
            select: { id: true },
        });
        if (!account) {
            return 'Akun tidak ditemukan atau bukan milik Anda.';
        }
    }
    if (data.categoryId) {
        const category = await prisma.category.findFirst({
            where: {
                id: data.categoryId,
                userId,
            },
            select: { id: true, type: true },
        });
        if (!category) {
            return 'Kategori tidak ditemukan atau bukan milik Anda.';
        }
        if (data.type) {
            const expectedType = data.type === 'INCOME'
                ? CategoryType.INCOME
                : CategoryType.EXPENSE;
            if (category.type !== expectedType) {
                return 'Jenis kategori tidak sesuai dengan jenis transaksi.';
            }
        }
    }
    return null;
}
async function validateTransferReferences(userId, transferFromId, transferToId) {
    if (!transferFromId || !transferToId) {
        return 'Akun asal dan akun tujuan wajib dipilih untuk transfer.';
    }
    if (transferFromId === transferToId) {
        return 'Akun asal dan akun tujuan tidak boleh sama.';
    }
    const accounts = await prisma.account.findMany({
        where: {
            userId,
            id: {
                in: [transferFromId, transferToId],
            },
        },
        select: { id: true },
    });
    if (accounts.length !== 2) {
        return 'Akun asal atau akun tujuan tidak ditemukan atau bukan milik Anda.';
    }
    return null;
}
// Validasi sesuai jenis transaksi.
async function validateTransactionInput(userId, data) {
    if (data.type === 'TRANSFER') {
        if (data.accountId || data.categoryId) {
            return 'Transfer tidak menggunakan akun tunggal atau kategori.';
        }
        if (!data.accountId) {
            return 'Akun wajib dipilih untuk transaksi pemasukan dan pengeluaran.';
        }
        if (!data.categoryId) {
            return 'Kategori wajib dipilih untuk transaksi pemasukan dan pengeluaran.';
        }
        return validateTransferReferences(userId, data.transferFromId, data.transferToId);
    }
    if (data.transferFromId || data.transferToId) {
        return 'Pemasukan dan pengeluaran tidak menggunakan akun transfer.';
    }
    return validateReferences(userId, data);
}
// GET /api/transactions
router.get('/', async (req, res) => {
    try {
        const type = req.query.type;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        if (type !== undefined &&
            type !== 'INCOME' &&
            type !== 'EXPENSE' &&
            type !== 'TRANSFER') {
            res.status(400).json({
                message: 'Filter type harus INCOME, EXPENSE, atau TRANSFER.',
            });
            return;
        }
        if ((startDate !== undefined &&
            (typeof startDate !== 'string' ||
                Number.isNaN(Date.parse(startDate)))) ||
            (endDate !== undefined &&
                (typeof endDate !== 'string' ||
                    Number.isNaN(Date.parse(endDate))))) {
            res.status(400).json({
                message: 'Format startDate atau endDate tidak valid.',
            });
            return;
        }
        const start = typeof startDate === 'string'
            ? new Date(startDate)
            : undefined;
        const end = typeof endDate === 'string'
            ? new Date(endDate)
            : undefined;
        if (start && end && start > end) {
            res.status(400).json({
                message: 'startDate tidak boleh setelah endDate.',
            });
            return;
        }
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: req.userId,
                ...(type ? { type: type } : {}),
                ...(start || end
                    ? {
                        date: {
                            ...(start ? { gte: start } : {}),
                            ...(end ? { lte: end } : {}),
                        },
                    }
                    : {}),
            },
            include: {
                account: {
                    select: { id: true, name: true },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        type: true,
                    },
                },
                transferFrom: {
                    select: { id: true, name: true },
                },
                transferTo: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { date: 'desc' },
            take: 100,
        });
        res.status(200).json({
            message: 'Transaksi berhasil diambil.',
            count: transactions.length,
            transactions,
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Gagal mengambil transaksi.',
        });
    }
});
// POST /api/transactions
router.post('/', async (req, res) => {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data transaksi tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    const data = parsed.data;
    const userId = req.userId;
    try {
        const referenceError = await validateTransactionInput(userId, data);
        if (referenceError) {
            res.status(400).json({ message: referenceError });
            return;
        }
        const isTransfer = data.type === 'TRANSFER';
        const transaction = await prisma.transaction.create({
            data: {
                type: data.type,
                amount: new Prisma.Decimal(data.amount),
                description: data.description ?? null,
                date: data.date ? new Date(data.date) : new Date(),
                userId,
                accountId: isTransfer ? null : (data.accountId ?? null),
                categoryId: isTransfer ? null : (data.categoryId ?? null),
                transferFromId: isTransfer ? data.transferFromId : null,
                transferToId: isTransfer ? data.transferToId : null,
            },
            include: {
                account: { select: { id: true, name: true } },
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        type: true,
                    },
                },
                transferFrom: {
                    select: { id: true, name: true },
                },
                transferTo: {
                    select: { id: true, name: true },
                },
            },
        });
        res.status(201).json({
            message: isTransfer
                ? 'Transfer berhasil ditambahkan.'
                : 'Transaksi berhasil ditambahkan.',
            transaction,
        });
    }
    catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({
            message: 'Gagal menambahkan transaksi.',
        });
    }
});
// GET /api/transactions/:id
router.get('/:id', async (req, res) => {
    try {
        const transaction = await prisma.transaction.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
            include: {
                account: { select: { id: true, name: true } },
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        type: true,
                    },
                },
                transferFrom: {
                    select: { id: true, name: true },
                },
                transferTo: {
                    select: { id: true, name: true },
                },
            },
        });
        if (!transaction) {
            res.status(404).json({
                message: 'Transaksi tidak ditemukan.',
            });
            return;
        }
        res.status(200).json({ transaction });
    }
    catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            message: 'Gagal mengambil transaksi.',
        });
    }
});
// PATCH /api/transactions/:id
router.patch('/:id', async (req, res) => {
    const parsed = updateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Data perubahan tidak valid.',
            errors: parsed.error.flatten(),
        });
        return;
    }
    const data = parsed.data;
    const userId = req.userId;
    try {
        const existing = await prisma.transaction.findFirst({
            where: {
                id: req.params.id,
                userId,
            },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Transaksi tidak ditemukan.',
            });
            return;
        }
        const newType = data.type ?? existing.type;
        const merged = {
            type: newType,
            amount: data.amount ?? Number(existing.amount),
            description: data.description !== undefined
                ? data.description
                : existing.description,
            date: data.date ??
                existing.date.toISOString(),
            accountId: data.accountId !== undefined
                ? data.accountId
                : existing.accountId,
            categoryId: data.categoryId !== undefined
                ? data.categoryId
                : existing.categoryId,
            transferFromId: data.transferFromId !== undefined
                ? data.transferFromId
                : existing.transferFromId,
            transferToId: data.transferToId !== undefined
                ? data.transferToId
                : existing.transferToId,
        };
        // Jika mengganti jenis transaksi, hapus referensi yang tidak relevan
        // hanya bila referensi tersebut tidak dikirim dalam request.
        if (data.type !== undefined && data.type !== existing.type) {
            if (newType === 'TRANSFER') {
                merged.accountId = null;
                merged.categoryId = null;
            }
            else {
                merged.transferFromId = null;
                merged.transferToId = null;
            }
        }
        const referenceError = await validateTransactionInput(userId, merged);
        if (referenceError) {
            res.status(400).json({ message: referenceError });
            return;
        }
        const isTransfer = merged.type === 'TRANSFER';
        const transaction = await prisma.transaction.update({
            where: { id: existing.id },
            data: {
                type: merged.type,
                amount: new Prisma.Decimal(merged.amount),
                description: merged.description ?? null,
                date: new Date(merged.date),
                accountId: isTransfer ? null : (merged.accountId ?? null),
                categoryId: isTransfer ? null : (merged.categoryId ?? null),
                transferFromId: isTransfer
                    ? merged.transferFromId
                    : null,
                transferToId: isTransfer
                    ? merged.transferToId
                    : null,
            },
            include: {
                account: { select: { id: true, name: true } },
                category: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        type: true,
                    },
                },
                transferFrom: {
                    select: { id: true, name: true },
                },
                transferTo: {
                    select: { id: true, name: true },
                },
            },
        });
        res.status(200).json({
            message: 'Transaksi berhasil diperbarui.',
            transaction,
        });
    }
    catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            message: 'Gagal memperbarui transaksi.',
        });
    }
});
// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
    try {
        const existing = await prisma.transaction.findFirst({
            where: {
                id: req.params.id,
                userId: req.userId,
            },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json({
                message: 'Transaksi tidak ditemukan.',
            });
            return;
        }
        await prisma.transaction.delete({
            where: { id: existing.id },
        });
        res.status(200).json({
            message: 'Transaksi berhasil dihapus.',
        });
    }
    catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({
            message: 'Gagal menghapus transaksi.',
        });
    }
});
export default router;
