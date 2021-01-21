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
            { name: "Add a department", value: addDepartment },
            { name: "Add a role", value: addRole },
            { name: "Add an employee", value: addEmployee },
            { name: "View all departments", value: viewAllDepartments },
            { name: "View all roles", value: viewAllRoles },
            { name: "View all employees", value: viewAllEmployees },
            { name: "Update an employee's role", value: updateEmployeeRole },
            { name: "Quit", value: quit }
        ]
    }).then(({ action }) => action());
}

// Add a department
async function addDepartment() {
    try {
        // Generate an array of department name strings to prevent making duplicate departments
        const departments = (await connection.queryPromise("SELECT name FROM departments")).map(row => row.name);
        // Get the new department name
        const newDepartment = inquirer.prompt({
            type: "input",
            name: "name",
            message: "What is the new department's name?",
            filter: input => input.trim(),
            validate: input => departments.includes(input) ? "That department already exists" : true
        });
        // Add the new department to the database
        await connection.queryPromise("INSERT INTO departments SET ?", await newDepartment);
        console.log("The department was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

// Add a role to a department
async function addRole() {
    try {
        const newRole = inquirer.prompt([{
            // Retrieve the departments from the database and have the user choose one
            type: "list",
            name: "department_id",
            message: "Choose a department to add a role to",
            choices: (await connection.queryPromise("SELECT * FROM departments")).map(dept => ({ name: dept.name, value: dept.department_id }))
        }, {
            // Have the user set a name for the new role
            type: "input",
            name: "title",
            message: "What is the title for this new role?",
            filter: input => input.trim(),
            // Retrieve a list of roles in the selected department and make sure the title input doesn't already exist
            validate: async function (input, answers) {
                return (await connection.queryPromise("SELECT title FROM roles WHERE ?", answers)).map(row => row.title).includes(input) ? "That role already exists" : true;
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
        await connection.queryPromise("INSERT INTO roles SET ?", await newRole);
        console.log("The role was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

// Add an employee
async function addEmployee() {
    try {
        const { role: { role_id, title } } = await chooseRole("add an employee to");
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
                message: ({first_name}) => `What is ${first_name}'s last name?`
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

// Update employee role
async function updateEmployeeRole() {
    try {
        // Choose an employee to update
        const { employee } = await chooseEmployee("update an employee in", "update");
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
async function chooseRole(actionClause) {
    try {
        const { department: { department_id } } = (await chooseDepartment(actionClause));
        return inquirer.prompt({
            // Retrieve the roles in the selected department and have the user choose one
            type: "list",
            name: "role",
            message: `Choose a role in that department to ${actionClause}`,
            // If the department doesn't have any roles, return false
            choices: async function () {
                const choices = (await connection.queryPromise("SELECT role_id, title FROM roles WHERE department_id=?", department_id)).map(role => ({ name: role.title, value: role }));
                return choices.length > 0 ? choices : [{ name: "This department doesn't have any roles.\n  Press enter to go back to the main menu.", value: false, short: "No Roles" }];
            }
        });
    } catch (err) { console.error(err); }
}

// Choose an employee by department and role
// Returns an employee to be used by modify and delete functions
async function chooseEmployee(actionClause, action) {
    try {
        const { role: { role_id } } = (await chooseRole(actionClause));
        return inquirer.prompt({
            // Retrieve the list of employees working in the selected role and have the user choose one
            type: "list",
            name: "employee",
            message: `Choose an employee in that role to ${action}`,
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

// End the database connection and quit the app by not calling mainMenu()
function quit() {
    connection.end();
}