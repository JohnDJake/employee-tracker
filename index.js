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
    // TODO display the main menu
}