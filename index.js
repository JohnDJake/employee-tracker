// Configure process.env including expansion for .env variables referencing existing environment variables
require("dotenv-expand")(require("dotenv").config());
// Import packages
const mysql = require("mysql");
const inquirer = require("inquirer");
const cTable = require("console.table");

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
    else mainMenu();
});

// Display the main menu
function mainMenu() {
    inquirer.prompt({
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
            { name: "Add a department", value: addDepartment },
            { name: "View all departments", value: viewAllDepartments },
            { name: "View all roles", value: viewAllRoles },
            { name: "View all employees", value: viewAllEmployees },
            { name: "Quit", value: quit }]
    }).then(({ action }) => action());
}

function addDepartment() {
    connection.query("SELECT name FROM departments", (err, res) => {
        if (err) console.error(err);
        else {
            const departments = res.map(row => row.name);
            inquirer.prompt({
                type: "input",
                name: "name",
                message: "What is the new department's name?",
                validate: input => departments.includes(input) ? "That department already exists" : true
            }).then(ans => {
                connection.query("INSERT INTO departments SET ?", ans, (err, res) => {
                    if (err) console.error(err);
                    else console.log("The department was successfully added!");
                    mainMenu();
                });
            });
        }
    });
}

function viewAllDepartments() {
    connection.query("SELECT * FROM departments", (err, res) => {
        if (err) console.error(err);
        else console.table(res);
        mainMenu();
    });
}

function viewAllRoles() {
    connection.query(`
        SELECT roles.role_id AS ID, roles.title AS Title, roles.salary AS Salary, departments.name AS Department
        FROM roles LEFT JOIN departments ON roles.department_id=departments.department_id`,
        (err, res) => {
            if (err) console.error(err);
            else console.table(res);
            mainMenu();
        }
    );
}

function viewAllEmployees() {
    connection.query(`
        SELECT employees.employee_id AS ID, employees.first_name AS 'First Name', employees.last_name AS 'Last Name',
        roles.title AS Title, departments.name AS Department, roles.salary AS Salary, CONCAT_WS(' ', managers.first_name, managers.last_name) AS Manager
        FROM employees LEFT JOIN roles ON employees.role_id=roles.role_id LEFT JOIN departments ON roles.department_id=departments.department_id
        LEFT JOIN employees AS managers on employees.manager_id=managers.employee_id`,
        (err, res) => {
            if (err) console.error(err);
            else console.table(res);
            mainMenu();
        }
    );
}

function quit() {
    connection.end();
}