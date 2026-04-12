/**
 * @file pagination.js
 * @description Reusable pagination helper for Mongoose queries.
 *
 * Every list endpoint in this API uses this utility so pagination behaviour
 * is identical everywhere: same query parameters, same response envelope,
 * same edge-case handling.
 *
 * Usage:
 * ```js
 * const { data, pagination } = await paginateQuery(User, filter, req.query, {
 *   sort: { createdAt: -1 },
 *   select: '-password -refreshToken',
 * });
 * ```
 *
 * Query parameters (all optional, all validated / clamped internally):
 *  - page  {number}  1-indexed page number. Defaults to 1.
 *  - limit {number}  Records per page. Defaults to DEFAULT_LIMIT. Max: MAX_LIMIT.
 *
 * Response shape:
 * ```json
 * {
 *   "data": [...],
 *   "pagination": {
 *     "totalDocs":   120,
 *     "totalPages":  6,
 *     "currentPage": 2,
 *     "limit":       20,
 *     "hasPrevPage": true,
 *     "hasNextPage": true,
 *     "prevPage":    1,
 *     "nextPage":    3
 *   }
 * }
 * ```
 *
 * Design notes:
 *  - countDocuments and find are run in parallel (Promise.all) to minimise
 *    round-trip latency.
 *  - The `lean` option is intentionally NOT applied here because callers may
 *    need instance methods (e.g. isPasswordCorrect). Pass `lean: true` in
 *    options if you only need plain objects.
 *
 * Future scope:
 *  - Cursor-based pagination: add `cursor` param support for real-time feeds
 *    where offset pagination causes duplicates on concurrent inserts.
 *  - Field projection per-request: allow clients to request sparse fieldsets
 *    via a `fields` query param (GraphQL-style over REST).
 *
 * @module utils/pagination
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default number of records returned when `limit` is not specified. */
const DEFAULT_LIMIT = 20;

/** Hard cap on records per request regardless of what the client sends. */
const MAX_LIMIT = 100;

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Executes a paginated Mongoose query and returns both the data and full
 * pagination metadata.
 *
 * @template T
 * @param {import('mongoose').Model<T>} model      - Mongoose model to query.
 * @param {object}                      filter     - Mongoose filter object.
 * @param {object}                      query      - Raw query params from req.query.
 * @param {PaginateOptions}             [options]  - Additional query options.
 * @returns {Promise<PaginateResult<T>>}
 */
export async function paginateQuery(model, filter = {}, query = {}, options = {}) {
   const { sort = { createdAt: -1 }, select = '', populate = null, lean = false } = options;

   // ── Parse and clamp page / limit ─────────────────────────────────────────
   const page = Math.max(1, parseInt(query.page, 10) || 1);
   const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
   const skip = (page - 1) * limit;

   // ── Run count + find in parallel ──────────────────────────────────────────
   const [totalDocs, docs] = await Promise.all([
      model.countDocuments(filter),
      buildQuery(model, filter, { sort, select, populate, lean, skip, limit }),
   ]);

   const totalPages = Math.ceil(totalDocs / limit) || 1;

   return {
      data: docs,
      pagination: {
         totalDocs,
         totalPages,
         currentPage: page,
         limit,
         hasPrevPage: page > 1,
         hasNextPage: page < totalPages,
         prevPage: page > 1 ? page - 1 : null,
         nextPage: page < totalPages ? page + 1 : null,
      },
   };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Builds and executes the Mongoose find query with all options applied.
 *
 * Extracted into its own function to keep `paginateQuery` readable and to
 * make the individual steps easy to extend independently.
 *
 * @param {import('mongoose').Model}  model
 * @param {object}                    filter
 * @param {object}                    opts
 * @returns {Promise<Array>}
 */
function buildQuery(model, filter, opts) {
   const { sort, select, populate, lean, skip, limit } = opts;

   let q = model.find(filter).sort(sort).skip(skip).limit(limit);

   if (select) q = q.select(select);
   if (populate) q = q.populate(populate);
   if (lean) q = q.lean();

   return q.exec();
}

// ─── JSDoc Typedefs ───────────────────────────────────────────────────────────

/**
 * @typedef {object} PaginateOptions
 * @property {object}          [sort]     - Mongoose sort object. Default: { createdAt: -1 }.
 * @property {string}          [select]   - Space/comma-separated field projection string.
 * @property {string|object}   [populate] - Mongoose populate path or options object.
 * @property {boolean}         [lean]     - If true, returns plain JS objects instead of Documents.
 */

/**
 * @typedef {object} PaginationMeta
 * @property {number}      totalDocs
 * @property {number}      totalPages
 * @property {number}      currentPage
 * @property {number}      limit
 * @property {boolean}     hasPrevPage
 * @property {boolean}     hasNextPage
 * @property {number|null} prevPage
 * @property {number|null} nextPage
 */

/**
 * @template T
 * @typedef {object} PaginateResult
 * @property {T[]}             data
 * @property {PaginationMeta}  pagination
 */
