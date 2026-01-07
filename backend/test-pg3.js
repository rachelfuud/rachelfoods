const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        database: 'rachelfood',
        user: 'postgres',
        // No password - should use trust auth
    });

    try {
        console.log('Testing without password (trust auth)...');
        await client.connect();
        console.log('✓ Successfully connected!');

        const result = await client.query('SELECT version()');
        console.log('PostgreSQL version:', result.rows[0].version);

    } catch (error) {
        console.error('✗ Connection failed:', error.message);
    } finally {
        await client.end();
    }
}

testConnection();
