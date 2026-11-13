const prisma = require('./prismaClient');

// Records who did what. Never throws: a failed audit write must not break the action itself.
// Usage: audit(req, 'event.approve', 'Event', event.id, { title })
async function audit(req, action, entityType, entityId, details) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: req && req.user ? req.user.id : null,
        action,
        entityType: entityType || null,
        entityId: entityId === undefined || entityId === null ? null : String(entityId),
        details: details || undefined,
        ip: req && req.ip ? String(req.ip).slice(0, 64) : null,
      },
    });
  } catch (e) {
    console.error('[audit] failed to write log:', e.message);
  }
}

module.exports = { audit };
