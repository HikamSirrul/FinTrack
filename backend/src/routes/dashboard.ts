
import { Router } from 'express'
import { TransactionType } from '@prisma/client'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const now = new Date()
    const userId = req.userId!

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    )

    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    )

    const [
      incomeResult,
      expenseResult,
      accounts,
      budgets,
      recentTransactions,
      savingsGoals,
    ] = await Promise.all([
      // Total pemasukan bulan berjalan
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.INCOME,
          date: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { amount: true },
      }),

      // Total pengeluaran bulan berjalan
      prisma.transaction.aggregate({
        where: {
          userId,
          type: TransactionType.EXPENSE,
          date: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { amount: true },
      }),

      // Akun beserta transaksi dan transfer
      prisma.account.findMany({
        where: { userId },
        include: {
          transactions: {
            where: {
              type: {
                in: [
                  TransactionType.INCOME,
                  TransactionType.EXPENSE,
                ],
              },
            },
            select: {
              amount: true,
              type: true,
            },
          },
          transfersOut: {
            select: { amount: true },
          },
          transfersIn: {
            select: { amount: true },
          },
        },
      }),

      // Anggaran pada bulan berjalan
      prisma.budget.findMany({
        where: {
          userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        include: {
          category: true,
        },
      }),

      // Batasi transaksi yang dimuat agar endpoint tetap ringan di Netlify.
      // Panel Dashboard tetap menyediakan scroll untuk melihat transaksi terbaru.
      prisma.transaction.findMany({
        where: { userId },
        include: {
          account: true,
          category: true,
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 50,
      }),

      // Sasaran tabungan
      prisma.savingsGoal.findMany({
        where: { userId },
        include: {
          contributions: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalIncome = Number(
      incomeResult._sum.amount ?? 0,
    )

    const totalExpense = Number(
      expenseResult._sum.amount ?? 0,
    )

    // Menghitung saldo semua akun
    const totalBalance = accounts.reduce(
      (sum, account) => {
        const transactionBalance =
          account.transactions.reduce(
            (value, transaction) => {
              const amount = Number(transaction.amount)

              return value +
                (transaction.type === TransactionType.INCOME
                  ? amount
                  : -amount)
            },
            0,
          )

        const outgoing = account.transfersOut.reduce(
          (value, transfer) =>
            value + Number(transfer.amount),
          0,
        )

        const incoming = account.transfersIn.reduce(
          (value, transfer) =>
            value + Number(transfer.amount),
          0,
        )

        return (
          sum +
          Number(account.initialBalance) +
          transactionBalance -
          outgoing +
          incoming
        )
      },
      0,
    )

    // Ringkasan anggaran dan pengeluaran per kategori
    const budgetSummary = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: TransactionType.EXPENSE,
            date: {
              gte: startOfMonth,
              lt: startOfNextMonth,
            },
          },
          _sum: { amount: true },
        })

        const budgetAmount = Number(budget.amount)
        const spentAmount = Number(
          spent._sum.amount ?? 0,
        )

        return {
          id: budget.id,
          category: budget.category,
          budgetAmount,
          spentAmount,
          remainingAmount: budgetAmount - spentAmount,
          percentage:
            budgetAmount > 0
              ? Math.round(
                  (spentAmount / budgetAmount) * 100,
                )
              : 0,
        }
      }),
    )

    // Ringkasan progres tabungan
    const savingsSummary = savingsGoals.map((goal) => {
      const targetAmount = Number(goal.targetAmount)
      const currentAmount = Number(goal.currentAmount)

      return {
        ...goal,
        targetAmount,
        currentAmount,
        remainingAmount: Math.max(
          targetAmount - currentAmount,
          0,
        ),
        percentage:
          targetAmount > 0
            ? Math.min(
                Math.round(
                  (currentAmount / targetAmount) * 100,
                ),
                100,
              )
            : 0,
      }
    })

    res.status(200).json({
      message: 'Ringkasan dashboard berhasil diambil.',
      summary: {
        period: {
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        totalIncome,
        totalExpense,
        monthlyCashFlow: totalIncome - totalExpense,
        totalBalance,
        budgets: budgetSummary,
        recentTransactions,
        savingsGoals: savingsSummary,
      },
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)

    res.status(500).json({
      message: 'Gagal mengambil ringkasan dashboard.',
    })
  }
})

export default router
