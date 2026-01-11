import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getAllUsers, getUserById, createUser, updateUser, deleteUser, resetUserPassword, userExists } from '../shared/users.js';
import { handleError, ValidationError, ForbiddenError } from '../shared/errors.js';
import { logAuditEvent } from '../shared/audit.js';

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

// List all users
router.get('/', async (req, res) => {
  try {
    const users = await getAllUsers(req.user.role);
    res.json({
      users: users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        protected: user.protected,
        createdAt: user.createdAt.toISOString()
      }))
    });
  } catch (error) {
    const errorResponse = handleError(error, 'users_list');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      protected: user.protected,
      createdAt: user.createdAt.toISOString()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'users_get');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Create user
router.post('/create', async (req, res) => {
  try {
    const { username, role = 'USER' } = req.body;

    if (!username || typeof username !== 'string' || username.length < 3) {
      throw new ValidationError('Username must be at least 3 characters');
    }

    if (role !== 'USER' && role !== 'ADMIN' && role !== 'SUPERADMIN') {
      throw new ValidationError('Role must be USER, ADMIN, or SUPERADMIN');
    }

    if (role === 'ADMIN' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenError('Only administrators can create admin users');
    }

    if (role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenError('Only super administrators can create SUPERADMIN users');
    }

    if (await userExists(username)) {
      throw new ValidationError('Username already exists');
    }

    const isAdminUsername = username.toLowerCase() === 'admin';
    const shouldProtect = isAdminUsername;

    const { user, password: generatedPassword } = await createUser(username, null, role, shouldProtect);

    await logAuditEvent({
      action: 'USER_CREATED',
      request: req,
      details: {
        createdBy: req.user.username,
        newUsername: user.username
      }
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      password: generatedPassword,
      createdAt: user.createdAt.toISOString()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'users_create');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { username, role, isActive } = req.body;
    const userId = req.params.id;

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    // Check protection rules
    if (user.protected) {
      const isAdminUsername = user.username.toLowerCase() === 'admin';
      if (isAdminUsername && req.user.role !== 'SUPERADMIN' && req.user.id !== userId) {
        throw new ForbiddenError('Only super admin or the admin user itself can edit admin user');
      }
      if (!isAdminUsername && req.user.role !== 'SUPERADMIN') {
        throw new ForbiddenError('Protected users can only be edited by super administrators');
      }
    }

    const updatedUser = await updateUser(userId, { username, role, isActive }, req.user.role);

    await logAuditEvent({
      action: 'USER_UPDATED',
      request: req,
      details: {
        updatedBy: req.user.username,
        targetUsername: updatedUser.username
      }
    });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      protected: updatedUser.protected,
      createdAt: updatedUser.createdAt.toISOString()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'users_update');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    if (user.protected && req.user.role !== 'SUPERADMIN') {
      throw new ForbiddenError('Protected users can only be deleted by super administrators');
    }

    await deleteUser(userId);

    await logAuditEvent({
      action: 'USER_DELETED',
      request: req,
      details: {
        deletedBy: req.user.username,
        deletedUsername: user.username
      }
    });

    res.status(204).send();
  } catch (error) {
    const errorResponse = handleError(error, 'users_delete');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

// Reset user password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' }
      });
    }

    const { password: newPassword } = await resetUserPassword(userId);

    await logAuditEvent({
      action: 'USER_PASSWORD_RESET',
      request: req,
      details: {
        resetBy: req.user.username,
        targetUsername: user.username
      }
    });

    res.json({
      password: newPassword
    });
  } catch (error) {
    const errorResponse = handleError(error, 'users_reset_password');
    res.status(errorResponse.status || 500).json(errorResponse.jsonBody);
  }
});

export default router;

