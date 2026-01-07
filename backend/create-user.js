const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
});

client.connect()
    .then(() => client.query("CREATE USER rachelfood WITH PASSWORD 'test123'"))
    .then(() => client.query('GRANT ALL PRIVILEGES ON DATABASE rachelfood TO rachelfood'))
    .then(() => console.log('User created successfully'))
    .catch(err => console.log('Error:', err.message))
    .finally(() => client.end());
