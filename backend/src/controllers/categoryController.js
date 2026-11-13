const prisma = require('../utils/prismaClient');
const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');
const { slugify } = require('../utils/categories');
const { audit } = require('../utils/audit');
const { parseId, categorySchema } = require('../utils/validators');

// GET /api/categories  (public) - with the number of upcoming published events in each
const list = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    prisma.eventCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.event.groupBy({
      by: ['category'],
      where: { status: 'PUBLISHED', endsAt: { gte: new Date() } },
      _count: { _all: true },
    }),
  ]);
  const byName = new Map(counts.map((c) => [c.category, c._count._all]));
  res.json({ categories: categories.map((c) => ({ ...c, eventCount: byName.get(c.name) || 0 })) });
});

const uniqueSlug = async (name, ignoreId) => {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const clash = await prisma.eventCategory.findUnique({ where: { slug } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
};

const create = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  if (await prisma.eventCategory.findUnique({ where: { name: data.name } })) throw new HttpError(409, 'A category with this name already exists');
  const category = await prisma.eventCategory.create({ data: { ...data, slug: await uniqueSlug(data.name) } });
  await audit(req, 'category.create', 'EventCategory', category.id, { name: category.name });
  res.status(201).json({ category });
});

// Renaming also renames the category on existing events, so nothing is orphaned.
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const data = categorySchema.partial().parse(req.body);
  const existing = await prisma.eventCategory.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Category not found');
  if (data.name && data.name !== existing.name && (await prisma.eventCategory.findUnique({ where: { name: data.name } }))) {
    throw new HttpError(409, 'A category with this name already exists');
  }

  const category = await prisma.$transaction(async (tx) => {
    const saved = await tx.eventCategory.update({
      where: { id },
      data: { ...data, slug: data.name ? await uniqueSlug(data.name, id) : undefined },
    });
    if (data.name && data.name !== existing.name) {
      await tx.event.updateMany({ where: { category: existing.name }, data: { category: data.name } });
    }
    return saved;
  });
  await audit(req, 'category.update', 'EventCategory', id, { name: category.name });
  res.json({ category });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const existing = await prisma.eventCategory.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Category not found');
  const used = await prisma.event.count({ where: { category: existing.name } });
  if (used > 0) throw new HttpError(409, `${used} event(s) use this category. Move them to another category first.`);
  await prisma.eventCategory.delete({ where: { id } });
  await audit(req, 'category.delete', 'EventCategory', id, { name: existing.name });
  res.json({ message: 'Category deleted' });
});

module.exports = { list, create, update, remove };
