import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { userRepository } from '../repositories';
import { AppError } from '../middleware/errorHandler';
import { AuthPayload } from '../middleware/auth';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.active) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Ungültige Anmeldedaten');
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    };
  },

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleName: 'ADMIN' | 'STAFF';
  }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError(409, 'E-Mail bereits registriert');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const role = await import('../config/database').then(({ prisma }) =>
      prisma.role.findUnique({ where: { name: data.roleName } })
    );
    if (!role) throw new AppError(500, 'Rolle nicht gefunden');

    return userRepository.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: { connect: { id: role.id } },
    });
  },
};
