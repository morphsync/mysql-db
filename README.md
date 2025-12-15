# @morphsync/mysql-db

A lightweight, fluent MySQL query builder for Node.js with connection pooling and transaction support.

[![npm version](https://img.shields.io/npm/v/@morphsync/mysql-db.svg)](https://www.npmjs.com/package/@morphsync/mysql-db)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/@morphsync/mysql-db.svg)](https://nodejs.org)

## Features

- 🚀 Fluent query builder interface
- 🔄 Connection pooling
- 💾 Transaction support
- 🛡️ SQL injection protection
- 📦 Zero dependencies (except mysql2)
- 🔧 Environment-based configuration
- ⚡ Promise-based API

## Installation

```bash
npm install @morphsync/mysql-db
```

## Quick Start

```javascript
const { MySQL } = require('@morphsync/mysql-db');

const db = new MySQL();
await db.connect();

// Simple query
const users = await db.table('users')
  .select('id', 'name', 'email')
  .where('status', 'active')
  .get();

console.log(users);
await db.disconnect();
```

## Configuration

Create a `.env` file in your project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=your_database
DB_PORT=3306
```

## API Reference

### Basic Operations

#### SELECT Queries

```javascript
// Get all records
const users = await db.table('users').get();

// Get single record
const user = await db.table('users').where('id', 1).first();

// Select specific columns
const users = await db.table('users').select('id', 'name').get();

// Count records
const count = await db.table('users').count();
```

#### INSERT Operations

```javascript
// Insert single record
const userId = await db.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com',
  status: 'active'
});

// Insert multiple records
const ids = await db.table('users').insert([
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' }
]);
```

#### UPDATE Operations

```javascript
// Update records
await db.table('users')
  .where('id', 1)
  .update({ name: 'Jane Doe', updated_at: new Date() });

// Update with conditions
await db.table('users')
  .where('status', 'inactive')
  .update({ status: 'active' });
```

#### DELETE Operations

```javascript
// Delete records
await db.table('users').where('id', 1).delete();

// Delete with conditions
await db.table('users').where('status', 'inactive').delete();
```

### Advanced Queries

#### WHERE Clauses

```javascript
// Basic where
.where('column', 'value')
.where('age', '>', 18)
.where('created_at', '<=', '2023-01-01')

// Multiple conditions
.where('status', 'active')
.where('age', '>', 18)

// OR conditions
.where('status', 'active')
.orWhere('role', 'admin')

// IN clause
.whereIn('id', [1, 2, 3, 4])
.whereNotIn('status', ['deleted', 'banned'])

// NULL checks
.whereNull('deleted_at')
.whereNotNull('email_verified_at')

// Raw where
.rawWhere('created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)')
```

#### JOINS

```javascript
// Inner join
await db.table('users')
  .join('profiles', 'users.id = profiles.user_id')
  .select('users.name', 'profiles.bio')
  .get();

// Left join
await db.table('users')
  .join('orders', 'users.id = orders.user_id', 'LEFT')
  .select('users.name', 'COUNT(orders.id) as order_count')
  .groupBy('users.id')
  .get();

// Multiple joins
await db.table('users')
  .join('profiles', 'users.id = profiles.user_id')
  .join('orders', 'users.id = orders.user_id', 'LEFT')
  .get();
```

#### Sorting and Limiting

```javascript
// Order by
.orderBy('created_at', 'DESC')
.orderBy('name', 'ASC')

// Group by
.groupBy('status')
.groupBy('department', 'role')

// Limit and offset
.limit(10)
.offset(20)
.limit(10, 20) // limit with offset
```

### Transactions

```javascript
try {
  await db.startTransaction();
  
  const userId = await db.table('users').insert({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  await db.table('profiles').insert({
    user_id: userId,
    bio: 'Software Developer'
  });
  
  await db.commit();
  console.log('Transaction completed successfully');
} catch (error) {
  await db.rollback();
  console.error('Transaction failed:', error);
}
```

### Raw Queries

```javascript
// Execute raw SQL
const results = await db.raw('SELECT * FROM users WHERE created_at > ?', ['2023-01-01']);

// Raw query with multiple parameters
const users = await db.raw(
  'SELECT u.*, p.bio FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.status = ? AND u.created_at > ?',
  ['active', '2023-01-01']
);
```

## Error Handling

```javascript
try {
  const users = await db.table('users').get();
} catch (error) {
  if (error.code === 'ER_NO_SUCH_TABLE') {
    console.error('Table does not exist');
  } else {
    console.error('Database error:', error.message);
  }
}
```

## Connection Management

```javascript
const db = new MySQL();

// Connect
await db.connect();

// Check connection status
if (db.isConnected()) {
  console.log('Database connected');
}

// Disconnect
await db.disconnect();
```

## Examples

### User Management System

```javascript
const { MySQL } = require('@morphsync/mysql-db');

class UserService {
  constructor() {
    this.db = new MySQL();
  }

  async init() {
    await this.db.connect();
  }

  async createUser(userData) {
    return await this.db.table('users').insert(userData);
  }

  async getUserById(id) {
    return await this.db.table('users')
      .where('id', id)
      .where('status', 'active')
      .first();
  }

  async getUsersWithProfiles() {
    return await this.db.table('users')
      .join('profiles', 'users.id = profiles.user_id', 'LEFT')
      .select('users.*', 'profiles.bio', 'profiles.avatar')
      .where('users.status', 'active')
      .orderBy('users.created_at', 'DESC')
      .get();
  }

  async updateUser(id, data) {
    return await this.db.table('users')
      .where('id', id)
      .update({ ...data, updated_at: new Date() });
  }

  async deleteUser(id) {
    // Soft delete
    return await this.db.table('users')
      .where('id', id)
      .update({ status: 'deleted', deleted_at: new Date() });
  }

  async close() {
    await this.db.disconnect();
  }
}
```

## Requirements

- Node.js >= 12.0.0
- MySQL >= 5.7 or MariaDB >= 10.2

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jay Chauhan**

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/morphsync/mysql-db/issues) on GitHub.

---

Made with ❤️ by [Morphsync](https://morphsync.com)
