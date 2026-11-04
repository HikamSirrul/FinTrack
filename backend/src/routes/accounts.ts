
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Semua endpoint akun wajib menggunakan JWT.
router.use(authenticate)

// Validasi data akun.
const accountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(['CASH', 'BANK', 'E_WALLET', 'OTHER']),
  initialBalance: z
    .number()
    .finite()
    .min(0)
    .max(9999999999999.99)
    .optional(),
})

// Menghitung saldo terkini berdasarkan transaksi akun.
async function calculateAccountBalance(
  accountId: string,
  userId: string,
  initialBalance: number,
): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [
        {
          accountId,
          type: {
            in: ['INCOME', 'EXPENSE'],
          },
        },
        {
          transferFromId: accountId,
          type: 'TRANSFER',
        },
        {
          transferToId: accountId,
          type: 'TRANSFER',
        },
      ],
    },
    select: {
      type: true,
      amount: true,
      accountId: true,
      transferFromId: true,
      transferToId: true,
    },
  })

  let balance = initialBalance

  for (const transaction of transactions) {
    const amount = Number(transaction.amount)

    if (
      transaction.type === 'INCOME' &&
      transaction.accountId === accountId
    ) {
      balance += amount
    } else if (
      transaction.type === 'EXPENSE' &&
      transaction.accountId === accountId
    ) {
      balance -= amount
    } else if (
      transaction.type === 'TRANSFER' &&
      transaction.transferFromId === accountId
    ) {
      balance -= amount
    } else if (
      transaction.type === 'TRANSFER' &&
      transaction.transferToId === accountId
    ) {
      balance += amount
    }
  }

  return balance
}

// GET /api/accounts
// Mengambil seluruh akun beserta saldo terkini.
router.get('/', async (req, res) => {
  try {
    const userId = req.userId!

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const initialBalance = Number(account.initialBalance)

        const currentBalance = await calculateAccountBalance(
          account.id,
          userId,
          initialBalance,
        )

        return {
          ...account,
          initialBalance,
          currentBalance,
        }
      }),
    )

    res.status(200).json({
      message: 'Daftar akun berhasil diambil.',
      accounts: accountsWithBalance,
    })
  } catch (error) {
    console.error('Get accounts error:', error)

    res.status(500).json({
      message: 'Gagal mengambil daftar akun.',
    })
  }
})

// POST /api/accounts
// Menambahkan akun baru.
router.post('/', async (req, res) => {
  const parsed = accountSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: 'Data akun tidak valid.',
      errors: parsed.error.flatten(),
    })
    return
  }

  try {
    const userId = req.userId!
    const initialBalance = parsed.data.initialBalance ?? 0

    const account = await prisma.account.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        initialBalance,
        userId,
      },
    })

    res.status(201).json({
      message: 'Akun berhasil ditambahkan.',
      account: {
        ...account,
        initialBalance: Number(account.initialBalance),
        currentBalance: Number(account.initialBalance),
      },
    })
  } catch (error) {
    console.error('Create account error:', error)

    res.status(500).json({
      message: 'Gagal menambahkan akun.',
    })
  }
})

// GET /api/accounts/:id
// Mengambil detail akun beserta saldo terkini.
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId!

    const account = await prisma.account.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!account) {
      res.status(404).json({
        message: 'Akun tidak ditemukan.',
      })
      return
    }

    const initialBalance = Number(account.initialBalance)

    const currentBalance = await calculateAccountBalance(
      account.id,
      userId,
      initialBalance,
    )

    res.status(200).json({
      message: 'Detail akun berhasil diambil.',
      account: {
        ...account,
        initialBalance,
        currentBalance,
      },
    })
  } catch (error) {
    console.error('Get account error:', error)

    res.status(500).json({
      message: 'Gagal mengambil detail akun.',
    })
  }
})

// PATCH /api/accounts/:id
// Memperbarui nama, jenis akun, atau saldo awal.
router.patch('/:id', async (req, res) => {
  const updateSchema = accountSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Minimal satu field harus diubah.',
    })

  const parsed = updateSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: 'Data perubahan tidak valid.',
      errors: parsed.error.flatten(),
    })
    return
  }

  try {
    const userId = req.userId!

    const existing = await prisma.account.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    })

    if (!existing) {
      res.status(404).json({
        message: 'Akun tidak ditemukan.',
      })
      return
    }

    const account = await prisma.account.update({
      where: {
        id: existing.id,
      },
      data: parsed.data,
    })

    const initialBalance = Number(account.initialBalance)

    const currentBalance = await calculateAccountBalance(
      account.id,
      userId,
      initialBalance,
    )

    res.status(200).json({
      message: 'Akun berhasil diperbarui.',
      account: {
        ...account,
        initialBalance,
        currentBalance,
      },
    })
  } catch (error) {
    console.error('Update account error:', error)

    res.status(500).json({
      message: 'Gagal memperbarui akun.',
    })
  }
})

// DELETE /api/accounts/:id
// Akun yang digunakan transaksi atau transfer tidak dapat dihapus.
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId!

    const existing = await prisma.account.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    })

    if (!existing) {
      res.status(404).json({
        message: 'Akun tidak ditemukan.',
      })
      return
    }

    const used = await prisma.transaction.count({
      where: {
        userId,
        OR: [
          { accountId: existing.id },
          { transferFromId: existing.id },
          { transferToId: existing.id },
        ],
      },
    })

    if (used > 0) {
      res.status(409).json({
        message:
          'Akun masih digunakan transaksi dan tidak dapat dihapus.',
      })
      return
    }

    await prisma.account.delete({
      where: {
        id: existing.id,
      },
    })

    res.status(200).json({
      message: 'Akun berhasil dihapus.',
    })
  } catch (error) {
    console.error('Delete account error:', error)

    res.status(500).json({
      message: 'Gagal menghapus akun.',
    })
  }
})

export default router
