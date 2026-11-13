// Reads ?page=&limit= from a query string with safe bounds.
const readPage = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
};

const pageInfo = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

module.exports = { readPage, pageInfo };
