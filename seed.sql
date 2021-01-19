-- Select my database
USE employee_tracker_db;

-- Create departments
INSERT INTO departments (name) VALUES ("Sales"), ("Engineering"), ("Fincance"), ("Legal");

-- Create roles
INSERT INTO roles (title, salary, department_id) VALUES
("Sales Lead", 100000, 1), ("Salesperson", 80000, 1),
("Lead Engineer", 150000, 2), ("Software Engineer", 120000, 2),
("Accountant", 125000, 3),
("Legal Team Lead", 250000, 4), ("Lawyer", 190000, 4);

-- Create employees
INSERT INTO employees (first_name, last_name, role_id, manager_id) VALUES
("John", "Jacobson", 3, NULL),
("John", "Doe", 4, 1),
("Jack", "Smith", 5, NULL);