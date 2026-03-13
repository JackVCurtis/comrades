# AGENT Instructions

## Development Process
- **Test Driven Development (TDD) is required for all code changes.**
- Follow the explicit TDD cycle for every behavior change or bug fix:
  1. **Write tests first** for the expected behavior.
  2. **Confirm tests fail (Red)** for the right reason.
  3. **Write implementation code** to satisfy the tests.
  4. **Confirm tests pass (Green)**.
  5. **Refactor code (Refactor)** while keeping tests green.
- During refactoring, prefer **DRY (Don't Repeat Yourself)** and **SOLID** design principles to improve maintainability.
- - **S**ingle Responsibility Classes
  - **O**pen to extension, closed to modification
  - **L**iskov Substition Principle: Classes or functions that call an interface should not know about the implementation of that interface
  - **I**nterfaces should be separated so they are minimally functional and independent
  - **D**ependency inversion: Classes and functions should receive dependencies as parameters implementing an interface, not import implementations
- Include or update automated tests for every behavior change or bug fix.
