import { createBuilder } from '../dist'

// Example 1: Basic custom SELECT statement
const [sql1, bindings1] = createBuilder()
  .select('SELECT COUNT(*) AS total')
  .from('users')
  .toSQL()

console.log('Example 1:')
console.log('SQL:', sql1)
console.log('Bindings:', bindings1)
console.log()

// Example 2: Complex SELECT with aggregation
const [sql2, bindings2] = createBuilder()
  .select('SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary')
  .from('employees')
  .where('active', true)
  .groupBy('department')
  .having('emp_count', '>', 5)
  .orderBy('avg_salary', 'desc')
  .toSQL()

console.log('Example 2:')
console.log('SQL:', sql2)
console.log('Bindings:', bindings2)
console.log()

// Example 3: SELECT DISTINCT
const [sql3, bindings3] = createBuilder()
  .select('SELECT DISTINCT category')
  .from('products')
  .where('price', '>', 100)
  .orderBy('category', 'asc')
  .toSQL()

console.log('Example 3:')
console.log('SQL:', sql3)
console.log('Bindings:', bindings3)