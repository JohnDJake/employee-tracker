-- Delete the database if it exists so I can create it from scratch
DROP DATABASE IF EXISTS employee_tracker_db;
CREATE DATABASE employee_tracker_db;

-- Use my new database
USE employee_tracker_db;

-- Create table of departments
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL,
    PRIMARY KEY (department_id)
);

-- Create table of roles
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT,
    title VARCHAR(30) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    department_id INT NOT NULL,
    PRIMARY KEY (role_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Create table of employees
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(30) NOT NULL,
    role_id INT NOT NULL,
    manager_id INT,
    PRIMARY KEY (employee_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
);
