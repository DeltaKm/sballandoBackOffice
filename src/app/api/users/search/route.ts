import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: '217.160.144.254',
  user: 'censimento',
  password: 'Cmh_2017',
  database: 'sballando.it',
  port: 3306,
};

export async function GET(request: NextRequest) {
  let connection;
  
  try {
    console.log('=== USER SEARCH API CALLED ===');
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    console.log('Search query:', query);

    if (!query || query.trim().length < 2) {
      console.log('Query too short, returning empty array');
      return NextResponse.json([]);
    }

    console.log('Attempting database connection...');
    console.log('DB Config:', { ...dbConfig, password: '***' });
    
    connection = await mysql.createConnection(dbConfig);
    console.log('Database connection successful!');
    
    // Prima verifichiamo se la tabella users esiste
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    console.log('Tables found:', tables);
    
    if (!tables || tables.length === 0) {
      throw new Error('Table "users" not found');
    }
    
    // Verifichiamo la struttura della tabella
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Table structure:', columns);
    
    const searchTerm = `%${query.trim()}%`;
    console.log('Search term:', searchTerm);
    
    // Query semplificata per test
    const [rows] = await connection.execute(`
      SELECT id, name, surname, nickname, email, picture
      FROM users 
      WHERE name LIKE ?
      LIMIT 5
    `, [searchTerm]);

    console.log('Query executed successfully, rows found:', rows.length);
    console.log('Sample data:', rows);

    return NextResponse.json(rows);
    
  } catch (error) {
    console.error("=== ERROR DETAILS ===");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { 
        error: "Errore durante la ricerca degli utenti",
        details: error.message,
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}