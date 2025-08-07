// helpers/pagination.js
function getPaginationParams(rawPage = 1, rawLimit = 10, totalItems = 0) {
    const limit = Math.max(parseInt(rawLimit) || 10, 1);
    const totalPages = Math.max(Math.ceil(totalItems / limit), 1);
    const page = Math.min(Math.max(parseInt(rawPage) || 1, 1), totalPages);
    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        totalPages,
        totalItems,
        offset,
    };
}

module.exports = {
    getPaginationParams,
};
