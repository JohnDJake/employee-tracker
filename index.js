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

async function addDepartment() {
    try {
        const departments = (await connection.queryPromise("SELECT name FROM departments")).map(row => row.name);
        const newDepartment = inquirer.prompt({
            type: "input",
            name: "name",
            message: "What is the new department's name?",
            filter: input => input.trim(),
            validate: input => departments.includes(input) ? "That department already exists" : true
        });
        await connection.queryPromise("INSERT INTO departments SET ?", await newDepartment);
        console.log("The department was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

async function addRole() {
    try {
        const newRole = inquirer.prompt([{
            type: "list",
            name: "department_id",
            message: "Choose a department to add a role to",
            choices: (await connection.queryPromise("SELECT * FROM departments")).map(dept => ({ name: dept.name, value: dept.department_id }))
        }, {
            type: "input",
            name: "title",
            message: "What is the title for this new role?",
            filter: input => input.trim(),
            validate: async function (input, answers) {
                return (await connection.queryPromise("SELECT title FROM roles WHERE ?", answers)).map(row => row.title).includes(input) ? "That role already exists" : true;
            }
        }, {
            type: "number",
            name: "salary",
            message: ({ title }) => `What is the salary for ${title} employees?`,
            filter: input => isNaN(input) ? "" : input,
            validate: input => input === "" || isNaN(input) ? "Please enter the salary as a number" : true
        }]);
        await connection.queryPromise("INSERT INTO roles SET ?", await newRole);
        console.log("The role was successfully added!");
    } catch (err) { console.error(err); }
    mainMenu();
}

async function addEmployee() {
    try {
        const newEmployee = inquirer.prompt([{
            type: "list",
            name: "department_id",
            message: "Choose a department to add an employee to",
            choices: (await connection.queryPromise("SELECT * FROM departments")).map(dept => ({ name: dept.name, value: dept.department_id }))
        }, {
            type: "list",
            name: "role_id",
            message: "Choose a role in that department to add an employee to",
            choices: async function (answers) {
                const choices = (await connection.queryPromise("SELECT role_id, title FROM roles WHERE ?", answers)).map(role => ({ name: role.title, value: role.role_id }));
                return choices.length > 0 ? choices : [{ name: "Please add a role to this department before adding an employee.\n  Press enter to go back to the main menu.", value: 0, short: "Create a role" }];
            }
        }, {
            type: "input",
            name: "first_name",
            message: "What is the new employee's first name?",
            when: ({ role_id }) => role_id
        }, {
            type: "input",
            name: "last_name",
            message: "What is the new employee's last name?",
            when: ({ role_id }) => role_id
        }]);
        if ((await newEmployee).role_id) {
            await connection.queryPromise("INSERT INTO employees SET ?", (({ department_id, ...newEmployee }) => newEmployee)(await newEmployee));
            console.log("The employee was successfully added!");
        }
    } catch (err) { console.error(err); }
    mainMenu();
}

async function viewAllDepartments() {
    try { console.table(await connection.queryPromise("SELECT * FROM departments")); } catch (err) { console.error(err); }
    mainMenu();
}

async function viewAllRoles() {
    try {
        console.table(await connection.queryPromise(`
            SELECT roles.role_id AS ID, roles.title AS Title, roles.salary AS Salary, departments.name AS Department
            FROM roles JOIN departments ON roles.department_id=departments.department_id
            ORDER BY departments.department_id`));
    } catch (err) { console.error(err); }
    mainMenu();
}

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

function quit() {
    connection.end();
}