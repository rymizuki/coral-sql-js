# Coral SQL.js - Development Knowledge Base

## Project Overview

Coral SQL.js is a TypeScript-based SQL query builder that provides type-safe, fluent API for constructing SQL queries. The library supports complex query operations including joins, subqueries, and JSON functions.

## Recent Major Changes (2025-08-25)

### JSON Helper Functions Implementation

#### Added Functions
- **`COALESCE`**: Handles NULL values with fallback options
- **`JSON_OBJECT`**: Creates JSON objects from key-value pairs
- **`JSON_ARRAYAGG`**: Aggregates values into JSON arrays

#### Usage Examples
```typescript
import { createBuilder, coalesce, json_object, json_array_aggregate } from 'coral-sql'

// JSON Object creation
const userQuery = createBuilder()
  .from('users')
  .column(json_object({ 
    id: 'id', 
    name: 'name', 
    email: 'email' 
  }))

// Complex aggregation with COALESCE
const orderSummary = createBuilder()
  .from('users', 'u')
  .leftJoin('orders', 'o', 'o.user_id = u.id')
  .column(json_object({
    user_name: 'u.name',
    orders: coalesce(
      json_array_aggregate(
        json_object({ id: 'o.id', total: 'o.total_amount' })
      ),
      '[]'
    )
  }))
  .groupBy('u.id')
```

### Type System Extensions

#### SQLBuilderConditionExpressionPort Integration
- Extended `SQLBuilderField` type to support condition expressions
- Enhanced `Columns.add()` to handle both SQLBuilderPort and SQLBuilderConditionExpressionPort
- Improved type safety across the codebase

#### Key Type Definitions
```typescript
export type SQLBuilderField = string | FieldPort | SQLBuilderPort | SQLBuilderConditionExpressionPort
```

## Architecture Deep Dive

### Binding Management System

#### Core Components
- **`Bindings` class**: Manages parameter binding and placeholder generation
- **`ensureToSQL()` function**: Creates SQL options with binding context
- **Parameter flow**: Values flow from conditions → bindings → final SQL

#### Key Challenge: Subquery Binding Duplication
**Problem**: When SQLBuilderPort subqueries are used in columns/groupBy/orderBy, bindings get duplicated because:
1. Parent query creates bindings object via `ensureToSQL()`
2. Subquery execution creates its own bindings
3. Both binding sets get merged, causing duplication

**Attempted Solutions**:
1. Manual binding integration - partial success
2. Shared binding context - improved but not perfect
3. ensureToSQL() reuse logic - better binding management

**Current Status**: Functional but with known binding duplication in complex scenarios

### Code Organization

#### Builder Pattern Implementation
```
SQLBuilder (main)
├── Columns (SELECT fields)
├── Conditions (WHERE/HAVING)
├── Groups (GROUP BY)  
├── Orders (ORDER BY)
├── Joins (JOIN operations)
└── Table (FROM clause)
```

#### Condition Expression Hierarchy
```
AbstractConditionExpression
├── ConditionExpression (basic operations)
├── ConditionExpressionNull (IS NULL/NOT NULL)
├── ConditionExpressionExists (EXISTS/NOT EXISTS)
├── ConditionExpressionCoalesce (COALESCE function)
├── ConditionExpressionJsonObject (JSON_OBJECT function)
└── ConditionExpressionJsonArrayAggregate (JSON_ARRAYAGG function)
```

## Implementation Patterns

### Adding New SQL Functions

1. **Create Expression Class**:
```typescript
export class ConditionExpressionMyFunction extends AbstractConditionExpression {
  constructor(private args: MyFunctionArgs) {
    super()
  }
  
  toSQL(options?: SQLBuilderToSQLInputOptions): [string, SQLBuilderBindingValue[]] {
    // Implementation
  }
}
```

2. **Export Helper Function**:
```typescript
export const myFunction = (args: MyFunctionArgs): SQLBuilderConditionExpressionPort => {
  return new ConditionExpressionMyFunction(args)
}
```

3. **Add to Index Exports**:
```typescript
export { myFunction } from './utils/my-function'
```

### Subquery Integration Best Practices

#### When handling SQLBuilderPort in field contexts:
```typescript
field = {
  getContent: (options) => {
    // Use parent bindings context to prevent duplication
    const [sql] = subquery.toSQL(options)
    return `(${sql})`
  }
}
```

#### Key insight: 
Always pass parent `options` to subquery `toSQL()` calls to maintain binding context consistency.

## Testing Strategy

### Test Structure
- **Unit tests**: Individual function testing
- **Integration tests**: Full query building scenarios  
- **Edge cases**: Complex nested queries, binding management

### Critical Test Areas
1. **JSON function combinations**
2. **Subquery binding management**
3. **Type safety validation**
4. **SQL output correctness**

## Development Commands

```bash
# Build
npm run build

# Test
npm test

# Lint (includes TypeScript check)
npm run lint

# Format
npm run format
```

## Known Issues & Limitations

### 1. Subquery Binding Duplication
- **Symptom**: Duplicate values in bindings array for complex subqueries
- **Impact**: Functional but inefficient parameter binding
- **Workaround**: Use unescape() for field references where appropriate

### 2. Type Inference Limitations
- **Issue**: Some complex nested queries may require explicit typing
- **Solution**: Use type annotations when TypeScript inference fails

## Future Enhancement Opportunities

### 1. Additional JSON Functions
- `JSON_EXTRACT`
- `JSON_SET` 
- `JSON_MERGE`

### 2. Window Functions
- `ROW_NUMBER()`
- `RANK()`
- `DENSE_RANK()`

### 3. Binding Management Optimization
- Implement binding deduplication
- Cache subquery results
- Optimize parameter placeholder generation

## Debugging Tips

### Common Issues

1. **"Missing support for operator"**:
   - Check if operator is defined in `ConditionExpression.createOperator()`
   - Verify operator type in `SQLBuilderOperator`

2. **Binding count mismatch**:
   - Debug with standalone subquery testing
   - Check `ensureToSQL()` binding context
   - Verify field reference vs parameter binding

3. **Type errors with new functions**:
   - Ensure proper export in `index.ts`
   - Check `SQLBuilderConditionExpressionPort` implementation
   - Verify type imports in consuming code

### Debugging Commands
```bash
# Test specific functionality
npm test -- --grep "your-test-pattern"

# Debug binding issues
node -e "const {createBuilder} = require('./dist'); console.log(builder.toSQL())"
```

## Contributing Guidelines

1. **Follow existing patterns** - Study similar implementations
2. **Add comprehensive tests** - Cover edge cases and integrations
3. **Update type definitions** - Maintain type safety
4. **Document new features** - Include usage examples
5. **Test with complex scenarios** - Verify binding management works correctly

---

*Last updated: 2025-08-25*
*Contributors: Claude Code Assistant*