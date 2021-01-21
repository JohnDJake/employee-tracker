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
        const newEmployee = inquirer.prompt([{
            // Retrieve the departments from the database and have the user choose one
            type: "list",
            name: "department_id",
            message: "Choose a department to add an employee to",
            choices: (await connection.queryPromise("SELECT * FROM departments")).map(dept => ({ name: dept.name, value: dept.department_id }))
        }, {
            // Retrieve the list of roles in the selected department and have the user choose one
            type: "list",
            name: "role_id",
            message: "Choose a role in that department to add an employee to",
            // If the department doesn't have any roles, return 0 as the role_id
            choices: async function (answers) {
                const choices = (await connection.queryPromise("SELECT role_id, title FROM roles WHERE ?", answers)).map(role => ({ name: role.title, value: role.role_id }));
                return choices.length > 0 ? choices : [{ name: "Please add a role to this department before adding an employee.\n  Press enter to go back to the main menu.", value: 0, short: "Create a role" }];
            }
        }, {
            // Ask for the new employee's first name
            type: "input",
            name: "first_name",
            message: "What is the new employee's first name?",
            // Skip this question if role_id is 0 because that means the user needs to create a role first
            when: ({ role_id }) => role_id
        }, {
            // Ask for the new employee's last name
            type: "input",
            name: "last_name",
            message: "What is the new employee's last name?",
            // Skip this question if role_id is 0 because that means the user needs to create a role first
            when: ({ role_id }) => role_id
        }]);
        // Only add the employee to the database if there was a role in the department to add them to
        if ((await newEmployee).role_id) {
            // Add the new employee to the database, using an object with all of the properties of newEmployee except department_id because the remaining keys match the table columns
            await connection.queryPromise("INSERT INTO employees SET ?", (({ department_id, ...newEmployee }) => newEmployee)(await newEmployee));
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

// View all employees
async function viewAllEmployees() {
    try {
        console.table(await connection.queryPromise(`
            SELECT employees.employee_id AS ID, employees.first_name AS 'First Name', employees.last_name AS 'Last Name',
            roles.title AS Title, departments.name AS Department, roles.salary AS Salary, CONCAT_WS(' ', managers.first_name, managers.last_name) AS Manager
            FROM employees JOIN roles ON employees.role_id=roles.role_id JOIN departments ON roles.department_id=departments.department_id
            LEFT JOIN employees AS managers on employees.manager_id=managers.employee_id`));
    } catch (err) { console.error(err); }
    mainMenu();
}

// End the database connection and quit the app by not calling mainMenu()
function quit() {
    connection.end();
}