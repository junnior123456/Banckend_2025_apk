const { execSync } = require('child_process');

try {
  const result = execSync('mysql -u root -p123456 -e "USE ecommerce_db; SELECT email, name, lastname FROM users;"', { encoding: 'utf8' });
  console.log('Usuarios en la base de datos:');
  console.log(result);
} catch (error) {
  console.error('Error:', error.message);
}