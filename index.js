// Configure process.env including expansion for .env variables referencing existing environment variables
require("dotenv-expand")(require("dotenv").config());
// Import packages
const mysql = require("mysql");
const inquirer = require("inquirer");
const cTable = require("console.table");
const { promisify } = require("util");

// Create database connection, variables should be configured in .env file
const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: "employee_tracker_db"
});

// Connect to database and call the main menu function
connection.connect(err => {
    if (err) console.error(err);
    else {
        connection.queryPromise = promisify(connection.query);
        mainMenu();
    }
});

// Display the main menu
function mainMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
            { name: "Add something", value: createMenu },
            { name: "View something", value: readMenu },
            { name: "Update something", value: updateMenu },
            { name: "Delete something", value: deleteMenu },
            { name: "Quit", value: quit }
        ]
    }).then(({ action }) => action());
}

// Display the create menu
function createMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to add?",
        choices: [
            { name: "Add a department", value: addDepartment },
            { name: "Add a role", value: addRole },
            { name: "Add an employee", value: addEmployee },
            { name: "Go back", value: mainMenu }
        ]
    }).then(({ action }) => action());
}

// Display the read menu
function readMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to view?",
        choices: [
            { name: "View all departments", value: viewAllDepartments },
            { name: "View all roles", value: viewAllRoles },
            { name: "View all employees", value: viewAllEmployees },
            { name: "View employees by manager", value: viewEmployeesByManager },
            { name: "Go back", value: mainMenu }
        ]
    }).then(({ action }) => action());
}

// Display the update menu
function updateMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to update?",
        choices: [
            { name: "Update an employee's role", value: updateEmployeeRole },
            { name: "Update an employee's manager", value: updateEmployeeManager },
            { name: "Go back", value: mainMenu }
        ]
    }).then(({ action }) => action());
}

// Display the delete menu
function deleteMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to delete?",
        choices: [
            { name: "Delete an employee", value: deleteEmployee },
            { name: "Go back", value: mainMenu }
        ]
    }).then(({ action }) => action());
}

// Add a department
async function addDepartment() {
    try {
        // Generate an array of department name strings to prevent making duplicate departments
        const departments = (await connection.queryPromise("SELECT name FROM departments")).map(row => row.name);
        // Get the new department name
        const newDepartment = await inquirer.prompt({
            type: "input",
            name: "name",
            message: "What is the new department's name?",
            filter: input => input.trim(),
            validate: input => departments.includes(input) ? "That department already exists" : true
        });
        // Add the new department to the database
        await connection.queryPromise("INSERT INTO departments SET ?", newDepartment);
        console.log("The department was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

// Add a role to a department
async function addRole() {
    try {
        // Choose a department
        const { department: { department_id, name } } = await chooseDepartment("add a role to");
        const newRole = await inquirer.prompt([{
            // Have the user set a name for the new role
            type: "input",
            name: "title",
            message: `What is the title for this new ${name} role?`,
            filter: input => input.trim(),
            // Retrieve a list of roles in the selected department and make sure the title input doesn't already exist
            validate: async function (input) {
                return (await connection.queryPromise("SELECT title FROM roles WHERE department_id=?", department_id)).map(row => row.title).includes(input) ? "That role already exists" : true;
            }
        }, {
            // Ask the user what the salary is in this role
            type: "number",
            name: "salary",
            message: ({ title }) => `What is the salary for ${title} employees?`,
            filter: input => isNaN(input) ? "" : input,
            validate: input => input === "" || isNaN(input) ? "Please enter the salary as a number" : true
        }]);
        // Add the new role to the database
        await connection.queryPromise("INSERT INTO roles SET ?", { ...newRole, department_id: department_id });
        console.log("The role was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

// Add an employee
async function addEmployee() {
    try {
        // Choose a department and a role
        const { role: { role_id, title, department_id } } = await chooseRole("add an employee to");
        // Don't add an employee if no role was selected
        if (role_id) {
            const newEmployee = await inquirer.prompt([{
                // Ask for the new employee's first name
                type: "input",
                name: "first_name",
                message: `What is the new ${title}'s first name?`
            }, {
                // Ask for the new employee's last name
                type: "input",
                name: "last_name",
                message: ({ first_name }) => `What is ${first_name}'s last name?`
            }, {
                // Select a manager for that employee in the same department, or null for no manager
                type: "list",
                name: "manager_id",
                message: ({ first_name, last_name }) => `Who is ${first_name} ${last_name}'s manager?`,
                choices: async function () { return await getEmployeesByDepartment(department_id, null); }
            }]);
            // Add the new employee to the database
            await connection.queryPromise("INSERT INTO employees SET ?", { ...newEmployee, role_id: role_id });
            console.log("The employee was successfully added!");
        }
    } catch (err) { console.error(err); }
    mainMenu();
}

// View all departments
async function viewAllDepartments() {
    try { console.table(await connection.queryPromise("SELECT * FROM departments")); } catch (err) { console.error(err); }
    mainMenu();
}

// View all roles, sorted by department
async function viewAllRoles() {
    try {
        console.table(await connection.queryPromise(`
            SELECT roles.role_id AS ID, roles.title AS Title, roles.salary AS Salary, departments.name AS Department
            FROM roles JOIN departments ON roles.department_id=departments.department_id
            ORDER BY departments.department_id`));
    } catch (err) { console.error(err); }
    mainMenu();
}

// View all employees, sorted by department then by role
async function viewAllEmployees() {
    try {
        console.table(await connection.queryPromise(`
            SELECT employees.employee_id AS ID, employees.first_name AS 'First Name', employees.last_name AS 'Last Name',
            roles.title AS Title, departments.name AS Department, roles.salary AS Salary, CONCAT_WS(' ', managers.first_name, managers.last_name) AS Manager
            FROM employees JOIN roles ON employees.role_id=roles.role_id JOIN departments ON roles.department_id=departments.department_id
            LEFT JOIN employees AS managers on employees.manager_id=managers.employee_id
            ORDER BY departments.department_id, roles.role_id`));
    } catch (err) { console.error(err); }
    mainMenu();
}

// Select a manager and then view all of their employees
async function viewEmployeesByManager() {
    try {
        const manager_id = (await inquirer.prompt({
            type: "list",
            name: "manager",
            message: "Select a manager to view all of their employees",
            choices: async function () {
                const managers = await connection.queryPromise("SELECT managers.* FROM employees JOIN employees AS managers ON employees.manager_id=managers.employee_id GROUP BY managers.employee_id;");
                return managers.map(manager => ({ name: `${manager.first_name} ${manager.last_name}`, value: manager }));
            }
        })).manager.employee_id;
        console.table(await connection.queryPromise(`
            SELECT employees.employee_id AS ID, employees.first_name AS 'First Name', employees.last_name AS 'Last Name',
            roles.title AS Title, departments.name AS Department, roles.salary AS Salary
            FROM employees JOIN roles ON employees.role_id=roles.role_id JOIN departments ON roles.department_id=departments.department_id
            WHERE employees.manager_id=?`, manager_id));
    } catch (err) { console.error(err); }
    mainMenu();
}

// Update employee role
async function updateEmployeeRole() {
    try {
        // Choose an employee to update
        const { employee } = await chooseEmployee("update an employee in");
        // Only keep going if an employee was selected
        if (employee) {
            // Select a role to move the employee to
            const { role } = await chooseRole(`move ${employee.first_name} ${employee.last_name} to`);
            // Only keep going if a new role was selected
            if (role) {
                // Update the employee in the database
                await connection.queryPromise("UPDATE employees SET role_id=? WHERE employee_id=?", [role.role_id, employee.employee_id]);
                console.log(`Successfully moved ${employee.first_name} ${employee.last_name} to ${role.title}`);
            }
        }
    } catch (err) { console.error(err); }
    mainMenu();
}

// Update employee manager
async function updateEmployeeManager() {
    try {
        // Choose a role to update an employee in
        // Choosing a role here instead of letting the chooseEmployee function do it lets us refer back to the department id
        const { role } = await chooseRole("update an employee in");
        // Only keep going if a role was selected
        if (role) {
            // Choose an employee in that role
            const { employee } = await chooseEmployee("update an employee in", role.role_id);
            if (employee) {
                // Choose another employee in that department as the manager
                const { manager_id } = await inquirer.prompt({
                    type: "list",
                    name: "manager_id",
                    message: `Choose a manager for ${employee.first_name} ${employee.last_name}`,
                    choices: async function () { return await getEmployeesByDepartment(role.department_id, employee.employee_id); }
                });
                // Update the employee in the database
                await connection.queryPromise("UPDATE employees SET manager_id=? WHERE employee_id=?", [manager_id, employee.employee_id]);
                console.log(`Successfully updated ${employee.first_name} ${employee.last_name}'s manager`);
            }
        }
    } catch (err) { console.error(err); }
    mainMenu();
}

// Delete an employee
async function deleteEmployee() {
    try {
        // Have the user select an employee
        const { employee } = (await chooseEmployee("delete an employee from"));
        // Ask for confirmation
        const { confirm } = await inquirer.prompt({
            type: "confirm",
            name: "confirm",
            message: `Are you sure you want to permanently delete ${employee.first_name} ${employee.last_name} (ID: ${employee.employee_id})?`
        });
        if (confirm) {
            // If the selected employee manages any employees, set their manager to null
            await connection.queryPromise("UPDATE employees SET manager_id=NULL WHERE manager_id=?", employee.employee_id);
            // Delete the selected employee
            await connection.queryPromise("DELETE FROM employees WHERE employee_id=?", employee.employee_id);
            console.log(`Successfully deleted ${employee.first_name} ${employee.last_name}`);
        } else { console.log("Nothing was deleted"); }
    } catch (err) { console.error(err); }
    mainMenu();
}

// Choose a department
async function chooseDepartment(actionClause) {
    try {
        return inquirer.prompt({
            // Retrieve the departments from the database and have the user choose one
            type: "list",
            name: "department",
            message: `Choose a department to ${actionClause}`,
            choices: (await connection.queryPromise("SELECT * FROM departments")).map(department => ({ name: department.name, value: department }))
        });
    } catch (err) { console.error(err); }
}

// Choose a role by department
async function chooseRole(actionClause, department_id_param) {
    try {
        // Choose a department
        const department_id = department_id_param || (await chooseDepartment(actionClause)).department.department_id;
        return inquirer.prompt({
            // Retrieve the roles in the selected department and have the user choose one
            type: "list",
            name: "role",
            message: `Choose a role in that department to ${actionClause}`,
            // If the department doesn't have any roles, return false
            choices: async function () {
                const choices = (await connection.queryPromise("SELECT * FROM roles WHERE department_id=?", department_id)).map(role => ({ name: role.title, value: role }));
                return choices.length > 0 ? choices : [{ name: "This department doesn't have any roles.\n  Press enter to go back to the main menu.", value: false, short: "No Roles" }];
            }
        });
    } catch (err) { console.error(err); }
}

// Choose an employee by department and role
// Returns an employee to be used by modify and delete functions
async function chooseEmployee(actionClause, role_id_param) {
    try {
        // Choose a department and a role
        const role_id = role_id_param || (await chooseRole(actionClause)).role.role_id;
        return inquirer.prompt({
            // Retrieve the list of employees working in the selected role and have the user choose one
            type: "list",
            name: "employee",
            message: `Choose an employee in that role to ${actionClause.split(" ")[0]}`,
            // If the role doesn't have any employees, return false
            choices: async function () {
                const choices = (await connection.queryPromise("SELECT * FROM employees WHERE role_id=?", role_id))
                    .map(employee => ({ name: `${employee.first_name} ${employee.last_name}`, value: employee }));
                return choices.length > 0 ? choices : [{ name: "This role doesn't have any employees.\n  Press enter to go back to the main menu.", value: false, short: "No Employees" }];
            },
            // Skip this question if role_id is false because that means there aren't any roles or employees in the selected department
            when: role_id
        });
    } catch (err) { console.error(err); }
}

// Generate an array of employees
async function getEmployeesByDepartment(department_id, employee_id) {
    try {
        const choices = (await connection.queryPromise(`
            SELECT employees.first_name, employees.last_name, employees.employee_id
            FROM employees JOIN roles on employees.role_id=roles.role_id
            WHERE roles.department_id=? AND employees.employee_id!=?`,
            [department_id, employee_id || 0])).map(employee => ({ name: `${employee.first_name} ${employee.last_name}`, value: employee.employee_id }));
        choices.push({ name: "None", value: null });
        return choices;
    } catch (err) { console.error(err); }
}

// End the database connection and quit the app by not calling mainMenu()
function quit() {
    connection.end();
}