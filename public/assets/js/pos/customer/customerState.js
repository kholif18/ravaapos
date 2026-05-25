// Customer/CustomerState - State management untuk customer
import {
    POS
} from '../core/state.js';

// Customer state
let customers = [];
let currentCustomer = null;
let customerListeners = [];

// Load customers from storage
export function loadCustomersFromStorage() {
    try {
        const saved = localStorage.getItem('pos_customers');
        if (saved) {
            customers = JSON.parse(saved);
        } else {
            customers = getDefaultCustomers();
            saveCustomersToStorage();
        }
    } catch (error) {
        console.error('Failed to load customers:', error);
        customers = getDefaultCustomers();
    }
    return customers;
}

function getDefaultCustomers() {
    return [{
            id: 1,
            name: 'Budi Santoso',
            phone: '08123456789',
            email: 'budi@email.com',
            type: 'member',
            points: 1500,
            address: 'Jl. Merdeka No. 1',
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Siti Aminah',
            phone: '08234567890',
            email: 'siti@email.com',
            type: 'member',
            points: 3200,
            address: 'Jl. Sudirman No. 5',
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            name: 'Ahmad Fauzi',
            phone: '08345678901',
            email: 'ahmad@email.com',
            type: 'regular',
            points: 0,
            address: 'Jl. Thamrin No. 10',
            createdAt: new Date().toISOString()
        },
        {
            id: 4,
            name: 'Dewi Lestari',
            phone: '08456789012',
            email: 'dewi@email.com',
            type: 'member',
            points: 500,
            address: 'Jl. Gatot Subroto No. 8',
            createdAt: new Date().toISOString()
        },
        {
            id: 5,
            name: 'Rizky Pratama',
            phone: '08567890123',
            email: 'rizky@email.com',
            type: 'regular',
            points: 0,
            address: 'Jl. Diponegoro No. 3',
            createdAt: new Date().toISOString()
        }
    ];
}

function saveCustomersToStorage() {
    localStorage.setItem('pos_customers', JSON.stringify(customers));
}

// Customer CRUD operations
export function getAllCustomers() {
    return [...customers];
}

export function getCustomerById(id) {
    return customers.find(c => c.id === id);
}

export function getCustomerByPhone(phone) {
    return customers.find(c => c.phone === phone);
}

export function searchCustomers(query) {
    if (!query || query.trim() === '') return [...customers];

    const searchTerm = query.toLowerCase().trim();
    return customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm))
    );
}

export function addCustomer(customerData) {
    const newId = Math.max(...customers.map(c => c.id), 0) + 1;
    const newCustomer = {
        id: newId,
        ...customerData,
        type: customerData.type || 'regular',
        points: customerData.points || 0,
        createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    saveCustomersToStorage();
    notifyCustomerListeners('added', newCustomer);

    return newCustomer;
}

export function updateCustomer(id, updates) {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    customers[index] = {
        ...customers[index],
        ...updates
    };
    saveCustomersToStorage();
    notifyCustomerListeners('updated', customers[index]);

    return customers[index];
}

export function deleteCustomer(id) {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    const deleted = customers[index];
    customers.splice(index, 1);
    saveCustomersToStorage();
    notifyCustomerListeners('deleted', deleted);

    return true;
}

// Current customer management
export function setCurrentCustomer(customer) {
    currentCustomer = customer;
    POS.selectedCustomer = customer;
    notifyCustomerListeners('selected', customer);
}

export function getCurrentCustomer() {
    return currentCustomer;
}

export function clearCurrentCustomer() {
    currentCustomer = null;
    POS.selectedCustomer = null;
    notifyCustomerListeners('cleared', null);
}

// Member points management
export function addPoints(customerId, points) {
    const customer = getCustomerById(customerId);
    if (customer && customer.type === 'member') {
        customer.points = (customer.points || 0) + points;
        saveCustomersToStorage();

        if (currentCustomer && currentCustomer.id === customerId) {
            setCurrentCustomer(customer);
        }

        notifyCustomerListeners('pointsUpdated', {
            customerId,
            points: customer.points
        });
        return true;
    }
    return false;
}

export function redeemPoints(customerId, pointsToRedeem) {
    const customer = getCustomerById(customerId);
    if (customer && customer.type === 'member' && (customer.points || 0) >= pointsToRedeem) {
        const discount = pointsToRedeem; // 1 point = Rp 1 (example)
        customer.points -= pointsToRedeem;
        saveCustomersToStorage();

        if (currentCustomer && currentCustomer.id === customerId) {
            setCurrentCustomer(customer);
        }

        notifyCustomerListeners('pointsRedeemed', {
            customerId,
            points: customer.points,
            discount
        });
        return discount;
    }
    return 0;
}

// Listener system
export function addCustomerListener(listener) {
    customerListeners.push(listener);
}

export function removeCustomerListener(listener) {
    const index = customerListeners.indexOf(listener);
    if (index > -1) customerListeners.splice(index, 1);
}

function notifyCustomerListeners(event, data) {
    customerListeners.forEach(listener => {
        try {
            listener(event, data);
        } catch (error) {
            console.error('Customer listener error:', error);
        }
    });
}

// Export untuk debugging
export function getCustomerStats() {
    return {
        total: customers.length,
        members: customers.filter(c => c.type === 'member').length,
        regular: customers.filter(c => c.type === 'regular').length,
        totalPoints: customers.reduce((sum, c) => sum + (c.points || 0), 0)
    };
}