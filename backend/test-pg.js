const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'rachelfood',
        user: 'rachelfood',
        password: 'rachelfood',
    });

    try {
        console.log('Testing direct pg connection...');
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
