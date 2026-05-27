'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('Sales', ['invoiceNumber'], {
      unique: true,
      name: 'idx_sales_invoice_number_unique'
    });
    await queryInterface.addIndex('Sales', ['customerId'], {
      name: 'idx_sales_customer_id'
    });
    await queryInterface.addIndex('Sales', ['paymentStatus'], {
      name: 'idx_sales_payment_status'
    });
    await queryInterface.addIndex('Sales', ['dueDate'], {
      name: 'idx_sales_due_date'
    });
    await queryInterface.addIndex('Sales', ['createdAt'], {
      name: 'idx_sales_created_at'
    });

    await queryInterface.addIndex('Products', ['barcode'], {
      name: 'idx_products_barcode'
    });
    await queryInterface.addIndex('Products', ['code'], {
      name: 'idx_products_code'
    });

    await queryInterface.addIndex('SalePayments', ['saleId'], {
      name: 'idx_sale_payments_sale_id'
    });
    await queryInterface.addIndex('SalePayments', ['paidAt'], {
      name: 'idx_sale_payments_paid_at'
    });

    await queryInterface.addIndex('Customers', ['total_debt'], {
      name: 'idx_customers_total_debt'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Customers', 'idx_customers_total_debt');

    await queryInterface.removeIndex('SalePayments', 'idx_sale_payments_paid_at');
    await queryInterface.removeIndex('SalePayments', 'idx_sale_payments_sale_id');

    await queryInterface.removeIndex('Products', 'idx_products_code');
    await queryInterface.removeIndex('Products', 'idx_products_barcode');

    await queryInterface.removeIndex('Sales', 'idx_sales_created_at');
    await queryInterface.removeIndex('Sales', 'idx_sales_due_date');
    await queryInterface.removeIndex('Sales', 'idx_sales_payment_status');
    await queryInterface.removeIndex('Sales', 'idx_sales_customer_id');
    await queryInterface.removeIndex('Sales', 'idx_sales_invoice_number_unique');
  }
};
