
import { Router } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

const savingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: z.number().positive().finite(),
  currentAmount: z.number().min(0).finite().optional(),
  deadline: z.coerce.date().nullable().optional(),
})

// GET /api/savings-goals
router.get('/', async (req, res) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json({
      message: 'Sasaran tabungan berhasil diambil.',
      goals,
    })
  } catch (error) {
    console.error('Get savings goals error:', error)
    res.status(500).json({
      message: 'Gagal mengambil sasaran tabungan.',
    })
  }
})

// POST /api/savings-goals
router.post('/', async (req, res) => {
  const parsed = savingsGoalSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: 'Data sasaran tabungan tidak valid.',
      errors: parsed.error.flatten(),
    })
    return
  }

  const { name, targetAmount, currentAmount, deadline } = parsed.data

  if (
    currentAmount !== undefined &&
    currentAmount > targetAmount
  ) {
    res.status(400).json({
      message: 'Jumlah tabungan terkumpul tidak boleh melebihi target.',
    })
    return
  }

  try {
    const goal = await prisma.savingsGoal.create({
      data: {
        name,
        targetAmount,
        currentAmount: currentAmount ?? 0,
        deadline: deadline ?? null,
        userId: req.userId!,
      },
    })

    res.status(201).json({
      message: 'Sasaran tabungan berhasil dibuat.',
      goal,
    })
  } catch (error) {
    console.error('Create savings goal error:', error)
    res.status(500).json({
      message: 'Gagal membuat sasaran tabungan.',
    })
  }
})

// GET /api/savings-goals/:id
router.get('/:id', async (req, res) => {
  try {
    const goal = await prisma.savingsGoal.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
      },
    })

    if (!goal) {
      res.status(404).json({
        message: 'Sasaran tabungan tidak ditemukan.',
      })
      return
    }

    res.status(200).json({
      message: 'Detail sasaran tabungan berhasil diambil.',
      goal,
    })
  } catch (error) {
    console.error('Get savings goal error:', error)
    res.status(500).json({
      message: 'Gagal mengambil detail sasaran tabungan.',
    })
  }
})

// PATCH /api/savings-goals/:id
router.patch('/:id', async (req, res) => {
  const parsed = savingsGoalSchema
    .partial()
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: 'Minimal satu field harus diubah.' },
    )
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: 'Data perubahan sasaran tidak valid.',
      errors: parsed.error.flatten(),
    })
    return
  }

  try {
    const existing = await prisma.savingsGoal.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
      },
    })

    if (!existing) {
      res.status(404).json({
        message: 'Sasaran tabungan tidak ditemukan.',
      })
      return
    }

    const nextTarget =
      parsed.data.targetAmount ?? Number(existing.targetAmount)

    const nextCurrent =
      parsed.data.currentAmount ?? Number(existing.currentAmount)

    if (nextCurrent > nextTarget) {
      res.status(400).json({
        message: 'Jumlah tabungan terkumpul tidak boleh melebihi target.',
      })
      return
    }

    const goal = await prisma.savingsGoal.update({
      where: { id: existing.id },
      data: parsed.data,
    })

    res.status(200).json({
      message: 'Sasaran tabungan berhasil diperbarui.',
      goal,
    })
  } catch (error) {
    console.error('Update savings goal error:', error)
    res.status(500).json({
      message: 'Gagal memperbarui sasaran tabungan.',
    })
  }
})

// DELETE /api/savings-goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.savingsGoal.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId!,
      },
    })

    if (!existing) {
      res.status(404).json({
        message: 'Sasaran tabungan tidak ditemukan.',
      })
      return
    }

    await prisma.savingsGoal.delete({
      where: { id: existing.id },
    })

    res.status(200).json({
      message: 'Sasaran tabungan berhasil dihapus.',
    })
  } catch (error) {
    console.error('Delete savings goal error:', error)
    res.status(500).json({
      message: 'Gagal menghapus sasaran tabungan.',
    })
  }
})

export default router
