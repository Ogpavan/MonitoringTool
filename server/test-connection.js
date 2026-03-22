import dotenv from 'dotenv';
import { buildOdbcConnectionString, testDatabaseConnection } from './db.js';

dotenv.config();

try {
  console.log('Testing SQL Server connection...');
  console.log(`ODBC string: ${buildOdbcConnectionString()}`);
  const details = await testDatabaseConnection();
  console.log('Connection successful.');
  console.log(JSON.stringify(details, null, 2));
} catch (error) {
  console.error('Connection failed.');
  console.error(error.message);
  process.exitCode = 1;
}
