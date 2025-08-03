export function calculateProductValues(products) {
    let totalCost = 0;
    let totalSale = 0;

    const enrichedProducts = products.map(p => {
        const isService = p.service === true || p.service === 'true';
        const stock = parseFloat(p.stock || 0);
        const cost = parseFloat(p.cost || 0);
        const sale = parseFloat(p.salePrice || 0);

        const nilai = isService ? sale : stock * sale;
        const nilaiCost = isService ? cost : stock * cost;

        totalCost += nilaiCost;
        totalSale += nilai;

        return {
            ...p.toJSON?.() || p, // mendukung Sequelize instance
            nilai,
            nilaiCost
        };
    });

    return {
        products: enrichedProducts,
        totalCost,
        totalSale
    };
}
