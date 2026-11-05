import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './config/prisma.js';
import authRouter from './routes/auth.js';
import transactionsRouter from './routes/transactions.js';
import categoriesRouter from './routes/categories.js';
import accountsRouter from './routes/accounts.js';
import budgetsRouter from './routes/budgets.js';
import savingsGoalsRouter from './routes/savingsGoals.js';
import dashboardRouter from './routes/dashboard.js';
const app = express();
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/transactions', transactionsRouter);
app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'FinTrack API is running',
    });
});
app.get('/api/health/db', async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({
            status: 'ok',
            message: 'Database connection successful',
        });
    }
    catch (error) {
        console.error('Database health check failed:', error);
        res.status(503).json({
            status: 'error',
            message: 'Database connection failed',
        });
    }
});
app.use('/api/accounts', accountsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/savings-goals', savingsGoalsRouter);
app.use('/api/dashboard', dashboardRouter);
export default app;
