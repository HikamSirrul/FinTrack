import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const registerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
});
const loginSchema = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
});
function createToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET belum dikonfigurasi');
    }
    return jwt.sign({ userId }, secret, { expiresIn: '1d' });
}
router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Nama, email valid, dan password minimal 8 karakter wajib diisi.',
        });
        return;
    }
    const name = parsed.data.name;
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(409).json({ message: 'Email sudah terdaftar.' });
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, passwordHash },
            select: { id: true, name: true, email: true },
        });
        res.status(201).json({
            message: 'Registrasi berhasil.',
            user,
            token: createToken(user.id),
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Registrasi gagal.' });
    }
});
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({
            message: 'Format email atau password tidak valid.',
        });
        return;
    }
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;
    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            res.status(401).json({ message: 'Email atau password salah.' });
            return;
        }
        res.status(200).json({
            message: 'Login berhasil.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            token: createToken(user.id),
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login gagal.' });
    }
});
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
            },
        });
        if (!user) {
            res.status(404).json({
                message: 'Pengguna tidak ditemukan.',
            });
            return;
        }
        res.status(200).json({
            message: 'Profil berhasil diambil.',
            user,
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            message: 'Gagal mengambil profil.',
        });
    }
});
export default router;
