# Employee Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

Employee Tracker is a command line interface for an employee database. It has a table of departments, roles in each department, and employees working in each role. Users can view, modify, change, and remove departments, roles, and employees.



## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Contributing](#contributing)
* [Tests](#tests)
* [License](#license)
* [Questions](#questions)


## Installation

The first step after cloning the repository is to set up the database.
Navigate to the application directory in your terminal, then open a MySQL console connected to your MySQL server. Run `SOURCE schema.sql` to set up the database. If you'd like to seed your database with some starter data, run `SOURCE seed.sql`. Once you're done with those you can exit the console.

The next step is to install the required node modules. Run `npm install` in the application directory.

Finally, create a file called `.env` with the connection information for your MySQL server. Check out [example.env](example.env) to see how that should be formatted.



## Usage

Run `npm start` from the application directory. Select what you'd like to do from the menu and follow the prompts.



## Contributing

Feel free to fork/pull. Use descriptive commits, comments, and pull requests.



## Tests

Employee Tracker doesn't have any tests.



## License

[MIT License](https://opensource.org/licenses/MIT)

A short and simple permissive license with conditions only requiring preservation of copyright and license notices. Licensed works, modifications, and larger works may be distributed under different terms and without source code.


## Questions

If you have questions take a look at my GitHub

[JohnDJake](https://github.com/JohnDJake)

Or send me an email

[john.d.jake@gmail.com](mailto:john.d.jake@gmail.com)

